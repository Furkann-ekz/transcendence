# Overview
1) ### Web 
    * [x] Major module: Use a framework to build the backend.
        *   done 
            * [x] Fastify 
            * [x] Node.js
    * [x] Minor module: Use a framework or a toolkit to build the frontend.
        *   done
            * [x] Tailwind CSS 
            * [x] Typescript
    * [x] Minor module: Use a database for the backend.
        *   done
            * [x] SQLite
    * [ ] Major module: Store the score of a tournament in the Blockchain.
2) ### User Management
    * [x] Major module: Standard user management, authentication, users across tournaments.
        *   done
            * [x] Users can securely subscribe to the website.
            * [x] Registered users can securely log in.
            * [x] Users can select a unique display name to participate in tournaments.
            * [x] Users can update their information.
            * [x] Users can upload an avatar, with a default option if none is provided.
            * [x] Users can add others as friends and view their online status.
            * [x] User profiles display stats, such as wins and losses.
            * [x] Each user has a Match History including 1v1 games, dates, and relevant details, accessible to logged-in users.
    * [ ] Major module: Implementing a remote authentication. Gameplay and user experience
    * [x] Major module: Remote players
    * [x] Major module: Multiplayer (more than 2 players in the same game).
    * [x] Major module: Add another game with user history and matchmaking.
    * [ ] Minor module: Game customization options.
    * [x] Major module: Live chat.
3) ### AI-Algo
    * [ ] Major module: Introduce an AI opponent.
    * [ ] Minor module: User and game stats dashboards
    * [ ] Cybersecurity
    * [ ] Major module: Implement WAF/ModSecurity with a hardened configuration and HashiCorp Vault for secrets management.
    * [ ] Minor module: GDPR compliance options with user anonymization, local data management, and Account Deletion.
    * [ ] Major module: Implement Two-Factor Authentication (2FA) and JWT.
4) ### Devops
    * [ ] Major module: Infrastructure setup for log management.
    * [x] Minor module: Monitoring system.
        * done
            * [x] Deploy Prometheus as the monitoring and alerting toolkit to collect metrics and monitor the health and performance of various system components.
            * [x] Configure data exporters and integrations to capture metrics from different services, databases, and infrastructure components.
            * [x] Create custom dashboards and visualizations using Grafana to provide realtime insights into system metrics and performance.
            * [x] Set up alerting rules in Prometheus to proactively detect and respond to critical issues and anomalies.
            * [x] Ensure proper data retention and storage strategies for historical metrics data.
            * [x] Implement secure authentication and access control mechanisms for Grafana to protect sensitive monitoring data.

    * [ ] Major module: Designing the backend as microservices.
5) ### Graphics
    * [ ] Major module: Use advanced 3D techniques.
6) ### Accessibility
    * [x] Minor module: Support on all devices.
        * done
            *  [x] Ensure the website is responsive, adapting to different screen sizes and orientations, providing a consistent user experience on desktops, laptops, tablets, and smartphones.
            *  [x] Ensure that users can easily navigate and interact with the website using different input methods, such as touchscreens, keyboards, and mice, depending on the device they are using.
    * [x] Minor module: Expanding browser compatibility.
        * done
            * [x] Extend browser support to include an additional web browser, ensuring that users can access and use the application seamlessly.
            * [x] Conduct thorough testing and optimization to ensure that the web application functions correctly and displays correctly in the newly supported browser.
            * [x] Address any compatibility issues or rendering discrepancies that may arise in the added web browser.
            * [x] Ensure a consistent user experience across all supported browsers maintaining usability and functionality.
    * [x] Minor module: Supports multiple languages.
    * [ ] Minor module: Add accessibility features for visually impaired users.
    * [ ] Minor module: Server-Side Rendering (SSR) integration.
7) ### Server-Side Pong
    * [ ] Major module: Replace basic Pong with server-side Pong and implement an API.
    * [ ] Major module: Enabling Pong gameplay via CLI against web users with API integration