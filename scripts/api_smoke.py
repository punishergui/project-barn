from app import create_app

app = create_app()

with app.test_client() as client:
    assert client.get('/api/health').status_code == 200
    assert client.get('/api/session').status_code == 200
    assert client.get('/api/shows').status_code == 200
    assert client.get('/api/tasks').status_code == 200

print('api smoke ok')
