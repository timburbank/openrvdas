* OpenRVDAS SSL/WSS

Note: these certificates aren't expected to be secure, etc.; we just
need something to allow us to serve wss://.

Clients are, for now, instructed to ignore certificates.

Server code should look like:

```
import ssl
import websockets

ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
cert_file = pathlib.Path(__file__).with_name('ssl/openrvdas.crt')
key_file = pathlib.Path(__file__).with_name('ssl/openrvdas.key')
ssl_context.load_cert_chain(cert_file, key_file)

# Couldn't get the stuff below to work in lieu of a cert
#ssl_context.check_hostname = False
#ssl_context.verify_mode = ssl.VerifyMode.CERT_NONE

start_server = websockets.serve(
    my_server, 'localhost', 8767, ssl=ssl_context
)

```

Client code should look like:

```
import ssl
import websockets

ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
ssl_context.check_hostname = False
ssl_context.verify_mode = ssl.VerifyMode.CERT_NONE

uri = 'wss://localhost:8767'
async with websockets.connect(uri, ssl=ssl_context) as websocket:
  ...
```

For Javascript - may need to set Chrome option to ignore invalid certificates:

 - chrome://flags/#allow-insecure-localhost

