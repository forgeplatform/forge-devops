import os

DATABASES = {
    'default': {
        'ATOMIC_REQUESTS': True,
        'ENGINE': 'forge.main.db.profiled_pg',
        'NAME': os.environ.get('DATABASE_NAME', os.environ.get('POSTGRES_DB', 'forge')),
        'USER': os.environ.get('DATABASE_USER', os.environ.get('POSTGRES_USER', 'forge')),
        'PASSWORD': os.environ.get('DATABASE_PASSWORD', os.environ.get('POSTGRES_PASSWORD', '')),
        'HOST': os.environ.get('DATABASE_HOST', os.environ.get('POSTGRES_HOST', 'postgres')),
        'PORT': os.environ.get('DATABASE_PORT', os.environ.get('POSTGRES_PORT', '5432')),
    }
}
