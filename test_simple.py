from fastapi import FastAPI
import uvicorn

app = FastAPI()

@app.get('/')
def home():
    return {'message': 'Chaplin funciona!', 'y2k': True}

@app.get('/health')
def health():
    return {'status': 'healthy', 'database': 'sqlite'}

if __name__ == '__main__':
    print('🚀 Iniciando Chaplin...')
    print('🌐 http://localhost:8000')
    print('📚 Docs: http://localhost:8000/docs')
    uvicorn.run(app, host='0.0.0.0', port=8000, reload=True)
