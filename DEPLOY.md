# Hosting Guide

This project is a Node.js + Express website, so host it as a web service.

## Recommended: Render

1. Create a GitHub repository and upload this project.
2. Go to Render and create a new Web Service.
3. Connect your GitHub repository.
4. Use these settings:
   - Build command: `npm install`
   - Start command: `npm start`
   - Environment: Node
5. Deploy.

Render will give you a public URL like:

```text
https://attendance-management-system.onrender.com
```

## Important

This project currently uses `data.json` for storage. That is fine for a demo, but for a real hosted app use MongoDB Atlas or another database so data is not lost between deployments.
