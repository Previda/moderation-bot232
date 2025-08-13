#!/bin/bash

# Quick MySQL DNS Fix for Raspberry Pi
# Fixes the ENOTFOUND sql306.infinityfree.com error

echo "🔧 Quick MySQL DNS Fix for Raspberry Pi"
echo "======================================="

# Backup original DNS config
echo "📋 Backing up original DNS configuration..."
sudo cp /etc/resolv.conf /etc/resolv.conf.backup 2>/dev/null || echo "⚠️ Could not backup DNS config"

# Set reliable DNS servers
echo "🌐 Setting reliable DNS servers..."
cat << EOF | sudo tee /etc/resolv.conf
# DNS fix for InfinityFree MySQL
nameserver 8.8.8.8
nameserver 1.1.1.1
nameserver 208.67.222.222
nameserver 9.9.9.9
EOF

# Flush DNS cache
echo "🔄 Flushing DNS cache..."
sudo systemctl flush-dns 2>/dev/null || echo "⚠️ systemd-resolved not available"

# Test DNS resolution
echo "🔍 Testing DNS resolution..."
if nslookup sql306.infinityfree.com 8.8.8.8 > /dev/null 2>&1; then
    echo "✅ DNS resolution working!"
    
    # Get IP address for backup
    IP=$(nslookup sql306.infinityfree.com 8.8.8.8 | grep "Address:" | tail -1 | awk '{print $2}')
    if [ ! -z "$IP" ]; then
        echo "📝 Resolved IP address: $IP"
        echo "💡 You can use this IP in your .env file if hostname still fails:"
        echo "   MYSQL_HOST=$IP"
    fi
else
    echo "❌ DNS resolution still failing"
    echo "🔄 Trying alternative approach..."
    
    # Try alternative DNS configuration
    cat << EOF | sudo tee /etc/resolv.conf
nameserver 1.1.1.1
nameserver 8.8.8.8
options timeout:5 attempts:2
EOF
    
    # Test again
    if nslookup sql306.infinityfree.com > /dev/null 2>&1; then
        echo "✅ Alternative DNS configuration working!"
    else
        echo "❌ DNS fix failed. Manual intervention required."
        echo "📋 Manual steps:"
        echo "1. Check your internet connection"
        echo "2. Try using IP address instead of hostname"
        echo "3. Contact InfinityFree support"
    fi
fi

# Test network connectivity
echo "🌐 Testing network connectivity..."
if ping -c 1 8.8.8.8 > /dev/null 2>&1; then
    echo "✅ Network connectivity OK"
else
    echo "❌ Network connectivity issues detected"
fi

echo ""
echo "🔄 DNS fix complete. Restart your bot to test:"
echo "   node index.js"
echo ""
echo "🔙 To restore original DNS settings:"
echo "   sudo mv /etc/resolv.conf.backup /etc/resolv.conf"
