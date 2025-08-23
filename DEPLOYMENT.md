# WeVote - Evennode Deployment Guide

## 🚀 Deploying WeVote to Evennode

### Prerequisites
- Evennode account (sign up at https://www.evennode.com/)
- Git installed on your computer
- Your WeVote project built and ready

### Step 1: Create Evennode Application

1. **Login to Evennode Dashboard**
   - Go to https://www.evennode.com/
   - Sign up or login to your account

2. **Create New Application**
   - Click "Create New App"
   - Choose a unique app name (e.g., "wevote-demo" or "your-name-wevote")
   - Select Node.js runtime
   - Choose your preferred region (US/EU)

### Step 2: Configure Environment Variables

In your Evennode dashboard, go to your app settings and add these environment variables:

```
NODE_ENV=production
PORT=8080
MONGODB_URI=mongodb+srv://wevoteusr:b8AxTcr1N3QURK67@wevote.oex8ioo.mongodb.net/?retryWrites=true&w=majority&appName=WeVote
DB_NAME=Wevote
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://wevoteemailservice.uk.communication.azure.com/;accesskey=5t4P0wvm15sRDliK64r5XzIWVVOstCrqHTfKJc8xf74tK1msAgslJQQJ99BHACULyCpi6wnzAAAAAZCSPsnI
EMAIL_FROM=DoNotReply@wevote.digital
JWT_SECRET=your-jwt-secret-key-here-change-this-in-production
ENCRYPTION_KEY=WeVote2025SecureEncryptionKey123!
WEBSITE_URL=https://your-app-name.evennode.com
```

**Important:** Change your-app-name to your actual Evennode app name.

### Step 3: Prepare Project for Git Deployment

1. **Initialize Git Repository** (if not already done)
   ```bash
   cd c:\Users\Computer\Desktop\WeVoteProject
   git init
   git add .
   git commit -m "Initial WeVote deployment"
   ```

2. **Add Evennode Remote**
   ```bash
   git remote add evennode https://git.evennode.com/your-app-name.git
   ```
   Replace `your-app-name` with your actual Evennode app name.

3. **Push to Evennode**
   ```bash
   git push evennode main
   ```

### Step 4: Domain and SSL Setup

1. **Custom Domain** (Optional)
   - In Evennode dashboard, go to "Domains"
   - Add your custom domain (e.g., wevote.yourdomain.com)
   - Update DNS records as instructed

2. **SSL Certificate**
   - Evennode provides free SSL certificates
   - Enable SSL in your app settings

### Step 5: Post-Deployment Configuration

1. **Update CORS Settings**
   - Your app will now accept requests from your Evennode domain
   - The dynamic CORS configuration will handle this automatically

2. **Test Your Application**
   - Visit https://your-app-name.evennode.com
   - Test all functionality:
     - User registration
     - Email verification
     - TOTP setup
     - Voting process
     - Admin dashboard

### Step 6: Database Management

Your MongoDB Atlas database will work seamlessly with Evennode. No additional configuration needed.

### Step 7: Monitoring and Logs

1. **Application Logs**
   - Check Evennode dashboard for application logs
   - Monitor for any errors or issues

2. **Performance Monitoring**
   - Evennode provides basic performance metrics
   - Monitor response times and error rates

### Troubleshooting

**Common Issues:**

1. **Build Errors**
   - Ensure all dependencies are in package.json
   - Check Node.js version compatibility

2. **Database Connection Issues**
   - Verify MongoDB URI in environment variables
   - Check network connectivity

3. **Email Service Issues**
   - Verify Azure Communication Services credentials
   - Check email sending limits

### Production Security Checklist

- [ ] Changed default JWT_SECRET
- [ ] Updated ENCRYPTION_KEY
- [ ] Enabled HTTPS/SSL
- [ ] Configured proper CORS settings
- [ ] Set secure session cookies
- [ ] Enabled MongoDB security features
- [ ] Regular security updates

### Backup Strategy

1. **Database Backups**
   - MongoDB Atlas provides automatic backups
   - Consider additional backup strategies for critical data

2. **Application Code**
   - Keep Git repository updated
   - Tag releases for easy rollback

### Scaling Considerations

1. **Traffic Growth**
   - Evennode provides easy scaling options
   - Monitor performance and upgrade plans as needed

2. **Database Scaling**
   - MongoDB Atlas offers horizontal scaling
   - Consider read replicas for high-traffic scenarios

---

## 🎉 Your WeVote Application is Now Live!

Once deployed, your secure digital voting platform will be accessible at:
- **Main Site:** https://your-app-name.evennode.com
- **Admin Panel:** https://your-app-name.evennode.com/admin

### Demo Credentials (for testing)
- **Admin Login:** admin / admin
- **Test Voter ID:** Use the voter registration flow

Remember to change default passwords and keys for production use!

---

## Support

For Evennode-specific issues, contact Evennode support.
For WeVote application issues, refer to your development team.
