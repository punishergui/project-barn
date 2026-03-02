FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY app.py ./app.py

ENV FLASK_APP=app
EXPOSE 5000

CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "app:create_app()"]
