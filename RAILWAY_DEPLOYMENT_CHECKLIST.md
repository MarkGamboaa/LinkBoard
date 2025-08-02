# Railway Deployment Checklist

## Pre-Deployment ✅
- [x] All code changes committed to GitHub
- [x] Environment variables configured
- [x] MongoDB Atlas database ready
- [x] Firebase project configured

## Backend Deployment (Railway)
- [ ] Create Railway account
- [ ] Connect GitHub repository
- [ ] Set root directory to `server`
- [ ] Add environment variables:
  - [ ] `MONGODB_URI` (MongoDB Atlas connection string)
  - [ ] `PORT` (optional, Railway auto-assigns)
- [ ] Deploy backend
- [ ] Copy backend URL

## Frontend Deployment (Vercel - Recommended)
- [ ] Create Vercel account
- [ ] Import GitHub repository
- [ ] Set root directory to `client`
- [ ] Add environment variable:
  - [ ] `VITE_API_URL` (Railway backend URL)
- [ ] Deploy frontend
- [ ] Copy frontend URL

## Testing
- [ ] Test backend API: `https://your-backend.up.railway.app/api/test`
- [ ] Test frontend functionality:
  - [ ] User registration/login
  - [ ] Create boards
  - [ ] Add links
  - [ ] Public/private toggle
  - [ ] View public boards
- [ ] Test on mobile devices

## Environment Variables Reference

### Backend (Railway)
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/linkboard?retryWrites=true&w=majority
PORT=3001
```

### Frontend (Vercel)
```
VITE_API_URL=https://your-backend-name.up.railway.app
```

## Troubleshooting
- [ ] Check Railway deployment logs
- [ ] Verify MongoDB connection
- [ ] Test API endpoints directly
- [ ] Check CORS configuration
- [ ] Verify environment variables 