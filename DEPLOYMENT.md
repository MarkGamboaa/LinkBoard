# LinkBoard Deployment Guide

This guide will help you deploy your LinkBoard application to the web.

## 🚨 Pre-Deployment Checklist

- [x] All hardcoded localhost URLs replaced with environment variables
- [x] Missing imports added (ProfilePage in DashboardPage)
- [x] Environment variable consistency fixed (MONGODB_URI/MONGO_URI)
- [x] Firebase configuration ready
- [x] MongoDB Atlas cluster set up

## Prerequisites

1. **GitHub Repository**: Your code should be pushed to GitHub
2. **MongoDB Atlas**: Set up a MongoDB Atlas cluster for production database
3. **Firebase Project**: Set up Firebase for authentication (already configured)

## Option 1: Vercel + Railway (Recommended)

### Frontend Deployment (Vercel)

1. **Go to [vercel.com](https://vercel.com)** and sign up with GitHub
2. **Click "New Project"** and import your GitHub repository
3. **Configure the build settings**:
   - Framework Preset: `Vite`
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`
4. **Add Environment Variables**:
   - `VITE_API_URL`: Your backend URL (e.g., `https://your-app.railway.app`)
5. **Deploy!**

### Backend Deployment (Railway)

1. **Go to [railway.app](https://railway.app)** and sign up with GitHub
2. **Click "New Project"** → "Deploy from GitHub repo"
3. **Select your repository**
4. **Configure the service**:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. **Add Environment Variables**:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
   - `PORT`: `3001` (or let Railway set it automatically)
6. **Deploy!**

## Option 2: Render (Full-Stack)

1. **Go to [render.com](https://render.com)** and sign up
2. **Create a new Web Service**
3. **Connect your GitHub repository**
4. **Configure for Node.js**:
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
5. **Add Environment Variables**:
   - `MONGODB_URI`: Your MongoDB Atlas connection string
6. **Deploy!**

### Frontend on Render

1. **Create another Web Service** for the frontend
2. **Configure**:
   - Root Directory: `client`
   - Build Command: `npm run build`
   - Start Command: `npm run preview`
3. **Add Environment Variables**:
   - `VITE_API_URL`: Your backend service URL
4. **Deploy!**

## Environment Variables

### Frontend (.env)
```env
VITE_API_URL=https://your-backend-url.com
```

### Backend (.env)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/linkboard
PORT=3001
```

## Database Setup

1. **MongoDB Atlas**:
   - Create a new cluster
   - Get your connection string
   - Add your IP address to the whitelist (or use 0.0.0.0/0 for all IPs)

2. **Update your backend** to use the production database URL

## CORS Configuration

The server already has CORS configured, but make sure it allows requests from your frontend domain:

```javascript
// In server/index.js (already configured)
app.use(cors());
```

## Testing Your Deployment

1. **Test the backend API** by visiting your backend URL + `/api/test`
2. **Test the frontend** by visiting your frontend URL
3. **Test user registration/login**
4. **Test creating boards and links**
5. **Test the public/private toggle**

## Troubleshooting

### Common Issues:

1. **CORS Errors**: The server uses `app.use(cors())` which should allow all origins
2. **Database Connection**: Verify your MongoDB connection string
3. **Environment Variables**: Ensure all environment variables are set correctly
4. **Build Errors**: Check the build logs for any missing dependencies

### Debugging:

1. **Check deployment logs** in your hosting platform
2. **Test API endpoints** using tools like Postman
3. **Check browser console** for frontend errors
4. **Verify environment variables** are loaded correctly

## Security Considerations

1. **Use HTTPS** in production (automatic with Vercel/Railway/Render)
2. **CORS is configured** to allow all origins (you can restrict this later)
3. **Environment variables** are used for sensitive data
4. **Firebase handles authentication** securely

## Monitoring

1. **Set up logging** for your backend
2. **Monitor database performance**
3. **Set up error tracking** (e.g., Sentry)
4. **Monitor API usage** and performance

## Cost Optimization

1. **Use free tiers** when possible
2. **Optimize database queries**
3. **Use CDN** for static assets
4. **Implement caching** where appropriate

## Next Steps

After deployment:
1. **Set up a custom domain** (optional)
2. **Configure SSL certificates** (automatic with most platforms)
3. **Set up monitoring and analytics**
4. **Implement backup strategies**
5. **Plan for scaling**

## Quick Deployment Commands

### For Vercel (Frontend):
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from client directory
cd client
vercel
```

### For Railway (Backend):
```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

---

For more detailed instructions, refer to the documentation of your chosen hosting platform. 