# Use an official Node.js image
FROM node:20

# Install required packages for Chrome and Python
RUN apt-get update && \
    apt-get install -y wget unzip python3 python3-pip python3-venv && \
    # Install Google Chrome
    wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb && \
    dpkg -i google-chrome-stable_current_amd64.deb || apt-get install -y -f && \
    rm google-chrome-stable_current_amd64.deb && \
    # Install ChromeDriver
    wget -N https://chromedriver.storage.googleapis.com/114.0.5735.90/chromedriver_linux64.zip && \
    unzip chromedriver_linux64.zip && \
    chmod +x chromedriver && \
    mv chromedriver /usr/local/bin/ && \
    rm chromedriver_linux64.zip

# Create a Python virtual environment
RUN python3 -m venv /venv

RUN apt-get install -y libopencv-dev gcc g++ x11-apps xvfb

#RUN g++ -o lol lol.c `pkg-config --cflags --libs opencv4`

# Install Python dependencies in the virtual environment
RUN /venv/bin/pip install --no-cache-dir selenium webdriver-manager pandas requests

# Create app directory
WORKDIR /app

# Copy app dependencies
COPY package*.json ./ 

# Install Node.js dependencies
RUN npm install

# Copy the rest of the app files
COPY . .

RUN pwd
RUN ls
RUN g++ -o lol lol.c `pkg-config --cflags --libs opencv4`

# Expose the web application port
EXPOSE 8081

# Start the Node.js application
CMD ["npm", "start"]
