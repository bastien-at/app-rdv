# Versions here must be same as in project dependencies (Cypress and playwright)
FROM cypress/included:13.15.1 AS cypress-13-15-1-playwright-webkit-1-48-2

RUN mkdir -p /home/docker
RUN export HOME=/home/docker && npx playwright@1.48.2 install-deps webkit && npx playwright@1.48.2 install webkit && export HOME=/root
RUN chmod -R 777 /home/docker
