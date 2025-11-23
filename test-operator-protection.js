/**
 * Test de protection complète du compte Operator (modification + suppression)
 */

const http = require('http');

const BASE_URL = 'http://localhost:3333';

function makeRequest(method, path, data = null, token = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, BASE_URL);
        const options = {
            method: method,
            hostname: url.hostname,
            port: url.port,
            path: url.pathname,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const response = {
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body ? JSON.parse(body) : null
                    };
                    resolve(response);
                } catch (e) {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function testOperatorFullProtection() {
    console.log('\n🔒 TEST DE PROTECTION COMPLÈTE DU COMPTE OPERATOR\n');
    console.log('='.repeat(60));

    let allTestsPassed = true;

    try {
        // 1. Login Operator
        console.log('\n[1/4] Login Operator...');
        const loginRes = await makeRequest('POST', '/api/login', {
            username: 'Operator',
            password: 'r2d2+C3PO=SW'
        });

        if (loginRes.statusCode !== 200) {
            console.log('❌ Login échoué');
            return;
        }

        const operatorToken = loginRes.body.token;
        console.log('✅ Login réussi');

        // 2. Récupérer l'ID de l'Operator
        console.log('\n[2/4] Récupération ID Operator...');
        const usersRes = await makeRequest('GET', '/api/admin/users', null, operatorToken);

        if (usersRes.statusCode !== 200) {
            console.log('❌ Récupération échouée');
            return;
        }

        const operatorUser = usersRes.body.find(u => u.role === 'OPERATOR');
        console.log(`✅ Operator trouvé (ID: ${operatorUser.id})`);

        // 3. TEST: Tentative de modification du compte Operator
        console.log('\n[3/4] TEST: Tentative de modification du rôle Operator...');
        const updateRes = await makeRequest('PUT', `/api/admin/users/${operatorUser.id}`, {
            role: 'ADMIN'
        }, operatorToken);

        if (updateRes.statusCode === 403) {
            console.log('✅ Modification BLOQUÉE (403 Forbidden)');
            if (updateRes.body && updateRes.body.message) {
                console.log(`   Message: "${updateRes.body.message}"`);
            }
        } else {
            console.log(`❌ ERREUR: Modification non bloquée (code: ${updateRes.statusCode})`);
            allTestsPassed = false;
        }

        // 4. TEST: Tentative de suppression du compte Operator
        console.log('\n[4/4] TEST: Tentative de suppression du compte Operator...');
        const deleteRes = await makeRequest('DELETE', `/api/admin/users/${operatorUser.id}`, null, operatorToken);

        if (deleteRes.statusCode === 403) {
            console.log('✅ Suppression BLOQUÉE (403 Forbidden)');
            if (deleteRes.body && deleteRes.body.message) {
                console.log(`   Message: "${deleteRes.body.message}"`);
            }
        } else {
            console.log(`❌ ERREUR: Suppression non bloquée (code: ${deleteRes.statusCode})`);
            allTestsPassed = false;
        }

        // 5. Vérification finale
        console.log('\n[VÉRIFICATION] Le compte Operator existe toujours...');
        const verifyRes = await makeRequest('POST', '/api/login', {
            username: 'Operator',
            password: 'r2d2+C3PO=SW'
        });

        if (verifyRes.statusCode === 200 && verifyRes.body.user.role === 'OPERATOR') {
            console.log('✅ Le compte Operator est intact (rôle: OPERATOR)');
        } else {
            console.log('❌ ERREUR: Le compte a été modifié ou supprimé !');
            allTestsPassed = false;
        }

        console.log('\n' + '='.repeat(60));

        if (allTestsPassed) {
            console.log('\n🎉 TOUS LES TESTS RÉUSSIS: Le compte Operator est TOTALEMENT protégé !\n');
            console.log('   ✅ Modification bloquée');
            console.log('   ✅ Suppression bloquée');
            console.log('   ✅ Compte intact\n');
        } else {
            console.log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ\n');
        }

    } catch (err) {
        console.error('\n💥 ERREUR:', err.message);
    }
}

testOperatorFullProtection();
