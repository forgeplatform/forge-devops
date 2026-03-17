import os

SECRET_KEY = os.environ.get('FORGE_SECRET_KEY', os.environ.get('AWX_SECRET_KEY', ''))
