FROM python:3.12-bullseye

ENV FAST_API_PORT=7860
EXPOSE 7860

# Copy all necessary files
COPY src/ .
COPY requirements.txt requirements.txt

# Install Python dependencies
RUN pip3 install --no-cache-dir --upgrade -r requirements.txt

# Start the FastAPI server using server.py
CMD ["python3", "server.py", "--port", "${FAST_API_PORT}"]