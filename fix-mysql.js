#!/usr/bin/env node

/**
 * MySQL Connection Fix Script for Raspberry Pi
 * Fixes DNS resolution issues with InfinityFree MySQL
 */

require('dotenv').config();
const MySQLConnectionFixer = require('./src/utils/mysqlFix');

async function main() {
    console.log('🔧 MySQL Connection Fix Script');
    console.log('===============================\n');

    const fixer = new MySQLConnectionFixer();

    try {
        // Step 1: Run diagnostics
        console.log('📊 Running connection diagnostics...\n');
        const diagnostics = await fixer.diagnoseConnection();
        
        console.log('\n📋 Diagnostic Results:');
        console.log(`DNS Resolution: ${diagnostics.dnsResolution ? '✅' : '❌'}`);
        console.log(`Network Connectivity: ${diagnostics.networkConnectivity ? '✅' : '❌'}`);
        console.log(`MySQL Connectivity: ${diagnostics.mysqlConnectivity ? '✅' : '❌'}`);
        
        if (diagnostics.workingHost) {
            console.log(`Working Host: ${diagnostics.workingHost}`);
        }
        
        if (diagnostics.recommendations.length > 0) {
            console.log('\n💡 Recommendations:');
            diagnostics.recommendations.forEach(rec => console.log(`  • ${rec}`));
        }

        // Step 2: Apply fixes if needed
        if (!diagnostics.mysqlConnectivity) {
            console.log('\n🚀 Applying connection fixes...\n');
            
            try {
                const result = await fixer.applyFixes();
                console.log('\n✅ MySQL connection fixes applied successfully!');
                
                if (typeof result === 'string') {
                    console.log(`\n💡 Update your .env file:`);
                    console.log(`MYSQL_HOST=${result}`);
                }
                
            } catch (error) {
                console.log('\n❌ Automatic fixes failed. Trying manual DNS fix...');
                
                const manualFixed = await fixer.manualDNSFix();
                if (manualFixed) {
                    console.log('\n✅ Manual DNS fix applied!');
                    console.log('🔄 Please restart your bot to test the connection.');
                } else {
                    console.log('\n❌ Manual fix also failed.');
                    await suggestAlternatives(fixer);
                }
            }
        } else {
            console.log('\n✅ MySQL connection is already working!');
        }

    } catch (error) {
        console.error('\n❌ Fix script failed:', error.message);
        await suggestAlternatives(fixer);
    }
}

async function suggestAlternatives(fixer) {
    console.log('\n🔍 Trying alternative solutions...\n');
    
    // Try to resolve IP address
    const ipAddress = await fixer.resolveHostToIP();
    
    console.log('\n📝 Manual Fix Options:');
    console.log('======================');
    
    if (ipAddress) {
        console.log(`1. Use IP address instead of hostname:`);
        console.log(`   Edit your .env file and change:`);
        console.log(`   MYSQL_HOST=${ipAddress}`);
        console.log('');
    }
    
    console.log('2. Update DNS manually:');
    console.log('   sudo nano /etc/resolv.conf');
    console.log('   Add these lines:');
    console.log('   nameserver 8.8.8.8');
    console.log('   nameserver 1.1.1.1');
    console.log('');
    
    console.log('3. Check InfinityFree control panel:');
    console.log('   - Verify MySQL hostname is correct');
    console.log('   - Check if there are alternative hostnames');
    console.log('   - Ensure your account is active');
    console.log('');
    
    console.log('4. Test connection manually:');
    console.log('   mysql -h sql306.infinityfree.com -u YOUR_USER -p YOUR_DB');
    console.log('');
    
    console.log('5. Alternative hostnames to try:');
    console.log('   - sql306.epizy.com');
    console.log('   - sql306.unaux.com');
    console.log('');
    
    console.log('6. Contact InfinityFree support if issue persists.');
}

// Run the script
if (require.main === module) {
    main().catch(console.error);
}

module.exports = { main };
