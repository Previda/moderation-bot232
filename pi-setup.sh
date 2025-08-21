#!/bin/bash

# 🍓 Raspberry Pi Specific Setup & Optimization
echo "🍓 Raspberry Pi Optimization for Sapphire Bot"
echo "============================================="

# Check Pi model and memory
PI_MODEL=$(cat /proc/device-tree/model 2>/dev/null || echo "Unknown")
TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_MEM_MB=$((TOTAL_MEM_KB / 1024))

echo "📟 Detected: $PI_MODEL"
echo "💾 RAM: ${TOTAL_MEM_MB}MB"

# Memory optimization based on Pi model
if [ $TOTAL_MEM_MB -lt 1024 ]; then
    echo "⚠️  Low memory Pi detected - applying aggressive optimizations"
    
    # Set swap file if not exists
    if [ ! -f /var/swap ]; then
        echo "💾 Creating 1GB swap file..."
        sudo fallocate -l 1G /var/swap
        sudo chmod 600 /var/swap
        sudo mkswap /var/swap
        sudo swapon /var/swap
        echo '/var/swap none swap sw 0 0' | sudo tee -a /etc/fstab
    fi
    
    # Node.js memory limits
    export NODE_OPTIONS="--max-old-space-size=384"
    echo 'export NODE_OPTIONS="--max-old-space-size=384"' >> ~/.bashrc
    
elif [ $TOTAL_MEM_MB -lt 2048 ]; then
    echo "🔧 Standard Pi optimization"
    export NODE_OPTIONS="--max-old-space-size=768"
    echo 'export NODE_OPTIONS="--max-old-space-size=768"' >> ~/.bashrc
else
    echo "✅ High-memory Pi - minimal optimization needed"
    export NODE_OPTIONS="--max-old-space-size=1536"
    echo 'export NODE_OPTIONS="--max-old-space-size=1536"' >> ~/.bashrc
fi

# GPU memory split optimization (headless)
if [ -f /boot/config.txt ]; then
    if ! grep -q "gpu_mem=" /boot/config.txt; then
        echo "📺 Optimizing GPU memory for headless operation..."
        echo "gpu_mem=16" | sudo tee -a /boot/config.txt
        echo "⚠️  Reboot required for GPU memory changes"
    fi
fi

# DNS optimization for cloud services
echo "🌐 Configuring DNS for reliable cloud connectivity..."
sudo cp /etc/resolv.conf /etc/resolv.conf.pi-backup 2>/dev/null
cat << EOF | sudo tee /etc/resolv.conf > /dev/null
# Pi DNS optimization for cloud services
nameserver 8.8.8.8
nameserver 1.1.1.1
nameserver 208.67.222.222
nameserver 8.8.4.4
EOF

# Network performance tweaks
echo "📡 Applying network optimizations..."
cat << EOF | sudo tee -a /etc/sysctl.conf > /dev/null

# Pi network optimization for Discord bot
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_congestion_control = bbr
EOF

# Install PM2 for process management
if ! command -v pm2 &> /dev/null; then
    echo "⚙️ Installing PM2 for process management..."
    npm install -g pm2
    
    # Create PM2 startup script
    pm2 startup | tail -n 1 | bash
fi

# Create systemd service
echo "🔧 Creating systemd service..."
cat << EOF | sudo tee /etc/systemd/system/sapphire-bot.service > /dev/null
[Unit]
Description=Sapphire Discord Moderation Bot
After=network.target
Wants=network-online.target

[Service]
Type=simple
User=pi
Group=pi
WorkingDirectory=/home/pi/sapphire-modbot
Environment=NODE_ENV=production
Environment=NODE_OPTIONS=--max-old-space-size=512
ExecStart=/usr/bin/node index.js
ExecReload=/bin/kill -HUP \$MAINPID
KillMode=mixed
Restart=always
RestartSec=10
StandardOutput=syslog
StandardError=syslog
SyslogIdentifier=sapphire-bot

[Install]
WantedBy=multi-user.target
EOF

# Enable but don't start service yet
sudo systemctl daemon-reload
sudo systemctl enable sapphire-bot

echo ""
echo "🍓 Raspberry Pi optimization complete!"
echo "====================================="
echo "Performance tweaks applied:"
echo "• Memory optimization for Node.js"
echo "• DNS configured for cloud reliability" 
echo "• Network performance enhanced"
echo "• Systemd service created"
echo "• PM2 process manager installed"
echo ""
echo "Next steps:"
echo "1. Reboot Pi: sudo reboot"
echo "2. Start bot service: sudo systemctl start sapphire-bot"
echo "3. Check status: sudo systemctl status sapphire-bot"
echo "4. View logs: journalctl -u sapphire-bot -f"
echo ""
