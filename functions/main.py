# Firebase Functions - Main Entry Point
from firebase_functions import https_fn
from firebase_admin import initialize_app

initialize_app()

@https_fn.on_request()
def hello_world(req: https_fn.Request) -> https_fn.Response:
    """A simple hello world endpoint for testing."""
    return https_fn.Response("Hello from Firebase Functions!")
