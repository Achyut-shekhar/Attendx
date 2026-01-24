FROM public.ecr.aws/lambda/python:3.11

# Copy requirements to the Lambda Task Root
COPY requirements.txt ${LAMBDA_TASK_ROOT}

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code to the Lambda Task Root
COPY . ${LAMBDA_TASK_ROOT}

# Start the handler
CMD ["main.handler"]
