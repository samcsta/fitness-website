# Vytryx Fitness Tracker

A comprehensive fitness tracking web application designed to be hosted on a Raspberry Pi. Vytryx helps you and your friends track workouts, nutrition, and progress with a push-pull-legs (PPL) workout split.

## Features

- **Daily Workout Generation**: Automatically generates workouts based on PPL split
- **Progress Tracking**: Track your weight, nutrition, and strength progress over time
- **Workout Customization**: Replace exercises you don't like with alternatives
- **Nutrition Tracking**: Log your meals, calories, protein, and sugar intake
- **Group Features**: See friends' progress and chat with your gym buddies
- **User Management**: Admin dashboard for creating and managing user accounts
- **Mobile-Friendly**: Responsive design that works on all devices

## Installation

### Prerequisites

- Raspberry Pi (3 or newer recommended) with Raspberry Pi OS
- Node.js (v14+) and npm
- Git (optional)

### Step 1: Clone or Download the Repository

```bash
# Using Git
git clone https://github.com/yourusername/vytryx.git

# Or manually download and extract to /opt/vytryx
```

### Step 2: Install Dependencies

```bash
cd /opt/vytryx
npm install
```

### Step 3: Configure the Application

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file to set your environment variables:

```
PORT=3000
SESSION_SECRET=your_secret_key_here
NODE_ENV=production
```

### Step 4: Initial Setup

Run the setup script to create the database tables and admin user:

```bash
node setup.js
```

Follow the prompts to create your admin account.

### Step 5: Start the Application

For manual start:

```bash
npm start
```

To set up as a service that runs on boot:

```bash
# Create service file
sudo nano /etc/systemd/system/vytryx.service

# Add the following content:
[Unit]
Description=Vytryx Fitness Tracker
After=network.target

[Service]
WorkingDirectory=/opt/vytryx
ExecStart=/usr/bin/npm start
Restart=always
User=pi
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target

# Save and exit, then enable and start the service
sudo systemctl enable vytryx.service
sudo systemctl start vytryx.service
```

## Accessing the Application

Once running, the application will be available at:

- Local access: `http://localhost:3000`
- Network access: `http://[raspberry-pi-ip]:3000`

You can set up a domain name by:

1. Configure port forwarding on your router (if accessing from outside your network)
2. Set up DNS records for your domain to point to your IP address
3. Optionally set up HTTPS using a reverse proxy like Nginx with Let's Encrypt

## Usage

### First Login

1. Log in with the admin credentials you created during setup
2. Go to the Admin page to create accounts for your friends
3. Share the credentials with your friends so they can log in

### Workouts

- The dashboard shows your daily workout based on the PPL split
- Navigate to the Workout page to see detailed exercises for the day
- Mark exercises as complete/incomplete or replace them with alternatives
- Track your weights, sets, and reps for each exercise

### Nutrition

- Use the Food page to log your meals throughout the day
- Track calories, protein, and added sugar for a balanced diet
- Log your weight daily to track progress over time

### Strength Tracking

- Visit the Strength page to see all available exercises
- Track your progress for each exercise over time
- Visualize your strength gains with progress charts

### Friends

- Check your friends' progress on the Friends page
- Use the group chat to motivate each other and share tips

## Customization

- Exercise list: Edit the `config/database.js` file to modify the default exercises
- Styling: Modify the CSS files in the `public/css` directory
- Frontend: Edit the EJS templates in the `views` directory
- Backend: Modify the controllers and routes as needed

## Backup and Restore

To backup your data:

```bash
cp /opt/vytryx/data/vytryx.db /path/to/backup/vytryx-backup-$(date +%Y%m%d).db
```

To restore from backup:

```bash
cp /path/to/backup/vytryx-backup.db /opt/vytryx/data/vytryx.db
```

## Troubleshooting

### Application Won't Start

- Check logs: `sudo journalctl -u vytryx.service`
- Verify permissions: `sudo chown -R pi:pi /opt/vytryx`
- Ensure Node.js is installed: `node -v`

### Database Issues

- Check database permissions: `sudo chown -R pi:pi /opt/vytryx/data`
- Reset database (will delete all data): `rm /opt/vytryx/data/vytryx.db && node setup.js`

### Connection Issues

- Check firewall settings: `sudo ufw status`
- Verify the application is running: `sudo systemctl status vytryx.service`
- Check the correct port is being used: Edit the `.env` file if needed

## License

MIT License

## Author

Created for your personal use. Feel free to modify and extend as needed.