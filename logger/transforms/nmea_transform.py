#!/usr/bin/env python3
"""Take in a dict of various values and emit NMEA strings appropriate
for them. NMEATransform is a thin wrapper around a set of individual
NMEA message-generating transforms. 

Each transform's __init__(self) method should expect a single 'kwargs'
dict as its initialization argument, in which it will search for the
keyword args it needs in order to function. If it does not find the
necessary args, then rather than throwing an error, its transform
method should just always return None.

Each transform's transform(record) method should expect its input in
standard OpenRVDAS dict format:

{'timestamp':5345345, 'fields':{'field1': value1, 'field2':value2,...}}

Each transform should return a (possibly empty) list of NMEA strings.

If they're not too terribly ugly, the NMEA transforms should be placed
in this file so as to minimize the risk that they may be inadvertently
used elsewhere.

"""

import logging
import sys

# For efficient checksum code
from functools import reduce
from operator import xor

from os.path import dirname, realpath; sys.path.append(dirname(dirname(dirname(realpath(__file__)))))

from logger.utils.timestamp import time_str
from logger.transforms.derived_data_transform import DerivedDataTransform

############################
def checksum(source):
  """Return hex checksum for source string."""
  return '%02X' % reduce(xor, (ord(c) for c in source))

################################################################################
class NMEATransform:
  """Call our various component transforms and generate NMEA strings from them.
  """
  def __init__(self, **kwargs):
    self.transforms = [MWDTransform(kwargs), XDRTransform(kwargs)]

  ############################
  def transform(self, record):
    """Expect a record dict (with 'timestamp' and 'fields' keys."""
    results = []
    for t in self.transforms:
      result = t.transform(record)
      logging.debug('transform %s: %s', t, result)
      if result:
        results.extend(result)

    # Just keep the results that are non-empty
    pruned_results = [r for r in results if r]

    # Concatenate them with a \r\n in-between
    if pruned_results:
      return '\r\n'.join(pruned_results) + '\r\n'
    else:
      return None

################################################################################
"""MWD - Wind Direction & Speed
$--MWD, x.x,T,x.x,M,x.x,N,x.x,M*hh<CR><LF>

$--: Talker identifier*
MWD: Sentence formatter*
x.x,T: Wind direction, 0° to 359° true*
x.x,M: Wind direction, 0° to 359° magnetic*
x.x,N: Wind speed, knots*
x.x,M: Wind speed, meters/second*
*hh: Checksum*

We get true wind direction ab initio, but if we don't have access to
vessel's magnetic variation, we can't generate the magnetic wind
direction, so omit if not available.
"""
################################################################################
class MWDTransform:
  """Output a NMEA MWD string, given true wind and (when available)
  magnetic variation.
  """
  def __init__(self, kwargs):
    """
    Look for these keys in the kwargs dict:
    ```
    true_wind_dir_field
             Field name to look for true wind direction
    true_wind_speed_kt_field
             Field name to look for wind speed in knots. Either this
             or true_wind_speed_ms_field must be non-empty.
    true_wind_speed_ms_field
             Field name to look for wind speed in meters per second.
             Either this or true_wind_speed_kt_field must be non-empty.
    magnetic_variation_field
             Vessel magnetic variation. If omitted, only true winds
             will be emitted.
    mwd_talker_id
             Should be format '--MWD' to identify the instrument
             that's creating the message.
    ```
    """
    self.true_wind_dir_field = kwargs.get('true_wind_dir_field', None)
    self.true_wind_speed_kt_field = kwargs.get('true_wind_speed_kt_field', None)
    self.true_wind_speed_ms_field = kwargs.get('true_wind_speed_ms_field', None)
    self.magnetic_variation_field = kwargs.get('magnetic_variation_field', None)
    self.mwd_talker_id = kwargs.get('mwd_talker_id', None)

    self.true_wind_dir = None
    self.true_wind_speed_kt = None
    self.true_wind_speed_ms = None
    self.magnetic_variation = None

  ############################
  def transform(self, record):
    """Incorporate any useable fields in this record. If it gives us a
    new MWD record, return it.
    """
    if not record or type(record) is not dict:
      logging.warning('Improper type for record: %s', type(record))
      return None
    fields = record.get('fields', None)
    if not fields:
      logging.debug('MWDTransform got record with no fields: %s', record)
      return None
    
    # Grab any relevant values
    self.true_wind_dir = fields.get(self.true_wind_dir_field,
                                    self.true_wind_dir)
    if self.true_wind_speed_kt_field:
      self.true_wind_speed_kt = fields.get(self.true_wind_speed_kt_field,
                                           self.true_wind_speed_kt)
    if self.true_wind_speed_ms_field:
      self.true_wind_speed_ms = fields.get(self.true_wind_speed_ms_field,
                                           self.true_wind_speed_ms)
    if self.magnetic_variation_field:
      self.magnetic_variation = fields.get(self.magnetic_variation_field,
                                           self.magnetic_variation)

    # Do we have enough values to emit a record? If not, go home.
    if self.true_wind_dir is None:
      logging.debug('Not all required values present - skipping')
      return None
    if self.true_wind_speed_kt is None and self.true_wind_speed_ms is None:
      logging.debug('Not all required values present - skipping')
      return None

    # Are we filling in meters per second from knots?
    if self.true_wind_speed_ms_field is None and \
       self.true_wind_speed_kt_field and \
       self.true_wind_speed_kt is not None:
      self.true_wind_speed_ms = self.true_wind_speed_kt * 0.514444

    # Are we filling in knots from meters per second from?
    if self.true_wind_speed_kt_field is None and \
       self.true_wind_speed_ms_field and \
       self.true_wind_speed_ms is not None:
      self.true_wind_speed_kt = self.true_wind_speed_kt * 1.94384

    # Do we have a magnetic variation? If so, provide mag winds,
    # otherwise use an empty string.
    if self.magnetic_variation is not None:
      mag_winds = '%3.1f' % (self.true_wind_dir - self.magnetic_variation)
    else:
      mag_winds = ''

    # Assemble string, compute checksum, and return it.
    result_str = '%s,%3.1f,T,%s,M,%3.1f,N,%3.1f,M' % \
                 (self.mwd_talker_id, self.true_wind_dir, mag_winds,
                   self.true_wind_speed_kt, self.true_wind_speed_ms)
    checksum = reduce(xor, (ord(c) for c in result_str))
    return ['$%s*%02X' % (result_str, checksum)]

#################################################################################
"""Take in records and emit a NMEA XDR string, as per format:

  $--XDR,a,x.x,a,c--c, ..... *hh<CR><LF> \\
Field Number:
1) Transducer Type
2) Measurement Data
3) Units of measurement
4) Name of transducer
x) More of the same
n) Checksum
Example:
$IIXDR,C,19.52,C,TempAir*19
$IIXDR,P,1.02481,B,Barometer*29
Measured Value | Transducer Type | Measured Data   | Unit of measure | Transducer Name
------------------------------------------------------------------------------------------------------
barometric     | "P" pressure    | 0.8..1.1 or 800..1100           | "B" bar         | "Barometer"
air temperature| "C" temperature |   2 decimals                    | "C" celsius     | "TempAir" or "ENV_OUTAIR_T"
pitch          | "A" angle       |-180..0 nose down 0..180 nose up | "D" degrees     | "PTCH" or "PITCH"
rolling        | "A" angle       |-180..0 L         0..180 R       | "D" degrees     | "ROLL"
water temp     | "C" temperature |   2 decimals                    | "C" celsius     | "ENV_WATER_T"
-----------------------------------------------------------------------------------------------------

We're going to cheat a bit here, as traditionally, a Transform is only
supposed to output zero or one record for every input record it
gets. We're going to emit multiple records as separate lines in a
single record and count on whatever gets them next (UDPWriter or
TextFileWriter, for example) acting appropriately.
"""
################################################################################
class XDRTransform:
  """Output a NMEA XDR string, given whatever variables we can find.
  """
  def __init__(self, kwargs):
    """
    Look for these keys in the kwargs dict:
    ```
    barometer_field
             Name of field that contains barometric pressure.
    barometer_output_field
             Transducer name of that should be output with barometer data.
             Defaults to barometer_field.
    air_temp_field
             Name of field that contains air temperature
    air_temp_output_field
             Transducer name of that should be output with air temp data.
             Defaults to air_temp_field.
    sea_temp_field
             Name of field that contains water temperature
    sea_temp_output_field
             Transducer name of that should be output with sea temp data.
             Defaults to sea_temp_field.
    talker_id
             Should be format '--XDR' to identify the instrument
             that's creating the message.
    ```
    """
    self.barometer_field = kwargs.get('barometer_field', None)
    self.barometer_output_field = kwargs.get('barometer_output_field',
                                             self.barometer_field)
    self.air_temp_field = kwargs.get('air_temp_field', None)
    self.air_temp_output_field = kwargs.get('air_temp_output_field',
                                            self.air_temp_field)
    self.sea_temp_field = kwargs.get('sea_temp_field', None)
    self.sea_temp_output_field = kwargs.get('sea_temp_output_field',
                                            self.sea_temp_field)
    self.xdr_talker_id = kwargs.get('xdr_talker_id', None)

  ############################
  def transform(self, record):
    """Incorporate any useable fields in this record, and if it gives us a
    new true wind value, return the results.
    """
    if not record or type(record) is not dict:
      logging.warning('Improper type for value dict: %s', type(record))
      return None
    fields = record.get('fields', None)
    if not fields:
      logging.debug('XDRTransform got record with no fields: %s', record)
      return None

    results = []
    # Grab any relevant values
    if self.barometer_field in fields:
      barometer = fields.get(self.barometer_field)
      barometer_data = '%s,P,%s,B,%s' % (self.xdr_talker_id, barometer,
                                         self.barometer_output_field)
      barometer_str = '$%s*%s' % (barometer_data, checksum(barometer_data))
      results.append(barometer_str)

    if self.air_temp_field in fields:
      air_temp = fields.get(self.air_temp_field)
      air_temp_data = '%s,C,%3.2f,C,%s' % (self.xdr_talker_id, float(air_temp),
                                           self.air_temp_output_field)
      air_temp_str = '$%s*%s' % (air_temp_data, checksum(air_temp_data))
      results.append(air_temp_str)

    if self.sea_temp_field in fields:
      sea_temp = fields.get(self.sea_temp_field)
      sea_temp_data = '%s,C,%3.2f,C,%s' % (self.xdr_talker_id, float(sea_temp),
                                           self.sea_temp_output_field)
      sea_temp_str = '$%s*%s' % (sea_temp_data, checksum(sea_temp_data))
      results.append(sea_temp_str)

    return results
