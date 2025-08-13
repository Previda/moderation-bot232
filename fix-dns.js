#!/usr/bin/env node

/**
 * Simple DNS Fix for MySQL Connection Issues
 * Run this on your Raspberry Pi to fix ENOTFOUND errors
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function fixDNS() {
    console.log('🔧 Fixing DNS for MySQL connection...\n');

    try {
        // Step 1: Backup current DNS
        console.log('📋 Backing up current DNS configuration...');
        await execAsync('sudo cp /etc/resolv.conf /etc/resolv.conf.backup').catch(() => {
            console.log('⚠️ Could not backup DNS config (continuing anyway)');
        });

        // Step 2: Set reliable DNS servers
        console.log('🌐 Setting reliable DNS servers...');
        const dnsConfig = `# DNS fix for InfinityFree MySQL
nameserver 8.8.8.8
nameserver 1.1.1.1
nameserver 208.67.222.222
nameserver 9.9.9.9`;

        await execAsync(`echo "${dnsConfig}" | sudo tee /etc/resolv.conf`);

        // Step 3: Test DNS resolution
        console.log('🔍 Testing DNS resolution...');
        try {
            const { stdout } = await execAsync('nslookup sql306.infinityfree.com 8.8.8.8');
            console.log('✅ DNS resolution working!');
            
            // Extract IP address
            const ipMatch = stdout.match(/Address: (\d+\.\d+\.\d+\.\d+)/);
            if (ipMatch) {
                const ip = ipMatch[1];
                console.log(`📝 Resolved IP: ${ip}`);
                console.log(`💡 You can also use this IP in your .env file:`);
                console.log(`   MYSQL_HOST=${ip}`);
            }
        } catch (error) {
            console.log('❌ DNS resolution still failing');
            console.log('🔄 Trying alternative DNS configuration...');
            
            const altDnsConfig = `nameserver 1.1.1.1
nameserver 8.8.8.8
options timeout:5 attempts:2`;
            
            await execAsync(`echo "${altDnsConfig}" | sudo tee /etc/resolv.conf`);
            
            try {
                await execAsync('nslookup sql306.infinityfree.com');
                console.log('✅ Alternative DNS configuration working!');
            } catch (altError) {
                console.log('❌ All DNS fixes failed');
                return false;
            }
        }

        // Step 4: Test network connectivity
        console.log('🌐 Testing network connectivity...');
        try {
            await execAsync('ping -c 1 8.8.8.8');
            console.log('✅ Network connectivity OK');
        } catch (error) {
            console.log('❌ Network connectivity issues');
        }

        console.log('\n✅ DNS fix completed successfully!');
        console.log('🔄 Now restart your bot:');
        console.log('   node index.js');
        console.log('\n🔙 To restore original DNS (if needed):');
        console.log('   sudo mv /etc/resolv.conf.backup /etc/resolv.conf');
        
        return true;

    } catch (error) {
        console.error('❌ DNS fix failed:', error.message);
        console.log('\n📋 Manual fix steps:');
        console.log('1. Edit DNS manually: sudo nano /etc/resolv.conf');
        console.log('2. Add these lines:');
        console.log('   nameserver 8.8.8.8');
        console.log('   nameserver 1.1.1.1');
        console.log('3. Save and restart bot');
        return false;
    }
}

// Run if called directly
if (require.main === module) {
    fixDNS().then(success => {
        process.exit(success ? 0 : 1);
    });
}

module.exports = { fixDNS };
