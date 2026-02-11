# Use an official slim Python image
FROM python:3.9-slim

# Best practice: set a working directory
WORKDIR /app

# Copy dependency list first to leverage Docker build cache
COPY groceries-api/requirements.txt .

# Install Python deps
RUN pip install --no-cache-dir -r requirements.txt

# Copy the app code
COPY groceries-api/ .

# Expose the port FastAPI uses
EXPOSE 8080

# Run Uvicorn (production: use workers / process manager or your cloud platform)
CMD ["uvicorn", "groceries_api:app", "--host", "0.0.0.0", "--port", "8080"]
