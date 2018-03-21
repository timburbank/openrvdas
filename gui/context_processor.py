from gui.settings import WEBSOCKET_SERVER

def global_settings(request):
    # return any necessary values
    return {
        'websocket_server': WEBSOCKET_SERVER
}