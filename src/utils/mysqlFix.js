const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const mysql = require('mysql2/promise');

/**
 * MySQL Connection Troubleshooter for Raspberry Pi
 * Fixes DNS resolution and connection issues with InfinityFree
 */

class MySQLConnectionFixer {
    constructor() {
        this.dnsServers = [
            '8.8.8.8',      // Google DNS
            '1.1.1.1',      // Cloudflare DNS
            '208.67.222.222', // OpenDNS
            '9.9.9.9'       // Quad9 DNS
        ];
        
        this.alternativeHosts = [
            'sql306.infinityfree.com',
            'sql306.epizy.com',
            'sql306.unaux.com'
        ];
    }

    async fixDNSResolution() {
        console.log('🔧 Attempting to fix DNS resolution...');
        
        try {
            // Try to resolve hostname with different DNS servers
            for (const dnsServer of this.dnsServers) {
                try {
                    console.log(`🔍 Testing DNS server: ${dnsServer}`);
                    const { stdout } = await execAsync(`nslookup sql306.infinityfree.com ${dnsServer}`);
                    
                    if (stdout.includes('Address:')) {
                        console.log(`✅ DNS resolution successful with ${dnsServer}`);
                        await this.updateSystemDNS(dnsServer);
                        return true;
                    }
                } catch (error) {
                    console.log(`❌ DNS server ${dnsServer} failed`);
                }
            }
            
            return false;
        } catch (error) {
            console.error('Error fixing DNS:', error.message);
            return false;
        }
    }

    async updateSystemDNS(dnsServer) {
        try {
            // For Raspberry Pi OS
            console.log(`🔧 Updating system DNS to ${dnsServer}...`);
            
            // Add to /etc/resolv.conf
            await execAsync(`echo "nameserver ${dnsServer}" | sudo tee /etc/resolv.conf.new`);
            await execAsync('sudo mv /etc/resolv.conf.new /etc/resolv.conf');
            
            console.log('✅ System DNS updated');
            
            // Flush DNS cache
            await execAsync('sudo systemctl flush-dns').catch(() => {
                // Ignore if systemd-resolved is not available
            });
            
        } catch (error) {
            console.log('⚠️ Could not update system DNS (may need manual configuration)');
        }
    }

    async testHostConnection(host, port = 3306) {
        try {
            console.log(`🔍 Testing connection to ${host}:${port}...`);
            
            const connection = await mysql.createConnection({
                host: host,
                port: port,
                user: process.env.MYSQL_USER,
                password: process.env.MYSQL_PASS,
                database: process.env.MYSQL_DB,
                connectTimeout: 10000,
                acquireTimeout: 10000,
                timeout: 10000
            });
            
            await connection.ping();
            await connection.end();
            
            console.log(`✅ Connection successful to ${host}`);
            return true;
            
        } catch (error) {
            console.log(`❌ Connection failed to ${host}: ${error.message}`);
            return false;
        }
    }

    async findWorkingHost() {
        console.log('🔍 Testing alternative MySQL hosts...');
        
        for (const host of this.alternativeHosts) {
            const isWorking = await this.testHostConnection(host);
            if (isWorking) {
                console.log(`✅ Found working host: ${host}`);
                return host;
            }
        }
        
        return null;
    }

    async createRobustConnection() {
        console.log('🔧 Creating robust MySQL connection...');
        
        const connectionConfig = {
            user: process.env.MYSQL_USER,
            password: process.env.MYSQL_PASS,
            database: process.env.MYSQL_DB,
            connectTimeout: 30000,
            acquireTimeout: 30000,
            timeout: 30000,
            reconnect: true,
            idleTimeout: 300000,
            // Connection pool settings
            connectionLimit: 5,
            queueLimit: 0,
            // Retry settings
            retryDelay: 2000,
            maxRetries: 3
        };

        // Try original host first
        try {
            console.log('🔍 Trying original host...');
            const pool = mysql.createPool({
                ...connectionConfig,
                host: process.env.MYSQL_HOST
            });
            
            await pool.execute('SELECT 1');
            console.log('✅ Original host working');
            return pool;
            
        } catch (error) {
            console.log('❌ Original host failed, trying alternatives...');
        }

        // Try alternative hosts
        for (const host of this.alternativeHosts) {
            try {
                console.log(`🔍 Trying alternative host: ${host}`);
                const pool = mysql.createPool({
                    ...connectionConfig,
                    host: host
                });
                
                await pool.execute('SELECT 1');
                console.log(`✅ Alternative host working: ${host}`);
                return pool;
                
            } catch (error) {
                console.log(`❌ Alternative host failed: ${host}`);
            }
        }

        throw new Error('All MySQL hosts failed to connect');
    }

    async diagnoseConnection() {
        console.log('🔍 Running MySQL connection diagnostics...');
        
        const diagnostics = {
            timestamp: new Date().toISOString(),
            environment: process.platform,
            nodeVersion: process.version,
            dnsResolution: false,
            networkConnectivity: false,
            mysqlConnectivity: false,
            workingHost: null,
            recommendations: []
        };

        // Test DNS resolution
        try {
            await execAsync('nslookup sql306.infinityfree.com');
            diagnostics.dnsResolution = true;
            console.log('✅ DNS resolution working');
        } catch (error) {
            console.log('❌ DNS resolution failed');
            diagnostics.recommendations.push('Fix DNS resolution using alternative DNS servers');
        }

        // Test network connectivity
        try {
            await execAsync('ping -c 1 8.8.8.8');
            diagnostics.networkConnectivity = true;
            console.log('✅ Network connectivity working');
        } catch (error) {
            console.log('❌ Network connectivity failed');
            diagnostics.recommendations.push('Check network connection and firewall settings');
        }

        // Test MySQL connectivity
        const workingHost = await this.findWorkingHost();
        if (workingHost) {
            diagnostics.mysqlConnectivity = true;
            diagnostics.workingHost = workingHost;
            console.log(`✅ MySQL connectivity working with ${workingHost}`);
        } else {
            console.log('❌ MySQL connectivity failed');
            diagnostics.recommendations.push('Check MySQL credentials and server status');
        }

        return diagnostics;
    }

    async applyFixes() {
        console.log('🚀 Applying MySQL connection fixes...');
        
        // Step 1: Fix DNS
        const dnsFixed = await this.fixDNSResolution();
        if (dnsFixed) {
            console.log('✅ DNS resolution fixed');
        }

        // Step 2: Test connections
        const workingHost = await this.findWorkingHost();
        if (workingHost) {
            console.log(`✅ Found working MySQL host: ${workingHost}`);
            
            // Update environment variable suggestion
            if (workingHost !== process.env.MYSQL_HOST) {
                console.log(`💡 Suggestion: Update MYSQL_HOST in .env to: ${workingHost}`);
            }
            
            return workingHost;
        }

        // Step 3: Create robust connection
        try {
            const pool = await this.createRobustConnection();
            console.log('✅ Robust MySQL connection created');
            return pool;
        } catch (error) {
            console.error('❌ All connection fixes failed');
            throw error;
        }
    }

    // Manual DNS fix for Raspberry Pi
    async manualDNSFix() {
        console.log('🔧 Applying manual DNS fix for Raspberry Pi...');
        
        const dnsConfig = `
# DNS Configuration for InfinityFree MySQL
nameserver 8.8.8.8
nameserver 1.1.1.1
nameserver 208.67.222.222
        `.trim();

        try {
            // Backup original resolv.conf
            await execAsync('sudo cp /etc/resolv.conf /etc/resolv.conf.backup');
            
            // Apply new DNS configuration
            await execAsync(`echo "${dnsConfig}" | sudo tee /etc/resolv.conf`);
            
            // Test DNS resolution
            await execAsync('nslookup sql306.infinityfree.com');
            
            console.log('✅ Manual DNS fix applied successfully');
            console.log('🔄 Please restart the bot to test the connection');
            
            return true;
            
        } catch (error) {
            console.error('❌ Manual DNS fix failed:', error.message);
            
            // Restore backup
            try {
                await execAsync('sudo mv /etc/resolv.conf.backup /etc/resolv.conf');
                console.log('🔄 Original DNS configuration restored');
            } catch (restoreError) {
                console.error('❌ Could not restore original DNS configuration');
            }
            
            return false;
        }
    }

    // Alternative: Use IP address instead of hostname
    async resolveHostToIP() {
        console.log('🔍 Resolving hostname to IP address...');
        
        try {
            const { stdout } = await execAsync('nslookup sql306.infinityfree.com 8.8.8.8');
            const ipMatch = stdout.match(/Address: (\d+\.\d+\.\d+\.\d+)/);
            
            if (ipMatch) {
                const ipAddress = ipMatch[1];
                console.log(`✅ Resolved IP address: ${ipAddress}`);
                console.log(`💡 Suggestion: Use IP address instead of hostname in .env: MYSQL_HOST=${ipAddress}`);
                return ipAddress;
            }
            
        } catch (error) {
            console.log('❌ Could not resolve hostname to IP');
        }
        
        return null;
    }
}

module.exports = MySQLConnectionFixer;
