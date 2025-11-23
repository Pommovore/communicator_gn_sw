/**
 * Script de test fonctionnel automatisé pour Antigravity - Version détaillée
 */

const http = require('http');
const fs = require('fs');

const BASE_URL = 'http://localhost:3333';
let testResults = [];
let detailedLog = [];

function log(message) {
    console.log(message);
    detailedLog.push(message);
}

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

function test(name, fn) {
    return fn()
        .then(() => {
            testResults.push({ name, status: 'PASS' });
            log(`✅ ${name}`);
        })
        .catch(err => {
            testResults.push({ name, status: 'FAIL', error: err.message });
            log(`❌ ${name}: ${err.message}`);
        });
}

function assert(condition, message) {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
}

let operatorToken;
let user1Token, user1Id, user1QR;
let user2Token, user2Id, user2QR;

async function runTests() {
    log('\n🚀 DÉMARRAGE DES TESTS FONCTIONNELS ANTIGRAVITY\n');
    log('='.repeat(60));

    await test('1. Serveur accessible', async () => {
        const res = await makeRequest('GET', '/');
        assert(res.statusCode === 200 || res.statusCode === 404, 'Serveur doit répondre');
    });

    await test('2. Login Operator', async () => {
        const res = await makeRequest('POST', '/api/login', {
            username: 'Operator',
            password: 'r2d2+C3PO=SW'
        });
        assert(res.statusCode === 200, `Login échoué: ${res.statusCode}`);
        assert(res.body.token, 'Token manquant');
        operatorToken = res.body.token;
    });

    await test('3. Création User1 (PJ)', async () => {
        const res = await makeRequest('POST', '/api/admin/users', {
            username: 'TestUser1',
            password: 'test123',
            role: 'PJ'
        }, operatorToken);
        assert(res.statusCode === 200, `Création échouée: ${res.statusCode}`);
        user1Id = res.body.id;
    });

    await test('4. Création User2 (PNJ)', async () => {
        const res = await makeRequest('POST', '/api/admin/users', {
            username: 'TestUser2',
            password: 'test456',
            role: 'PNJ'
        }, operatorToken);
        assert(res.statusCode === 200, `Création échouée: ${res.statusCode}`);
        user2Id = res.body.id;
    });

    await test('5. Login User1', async () => {
        const res = await makeRequest('POST', '/api/login', {
            username: 'TestUser1',
            password: 'test123'
        });
        assert(res.statusCode === 200, `Login échoué: ${res.statusCode}`);
        user1Token = res.body.token;
        user1QR = res.body.user.qr_code;
    });

    await test('6. Login User2', async () => {
        const res = await makeRequest('POST', '/api/login', {
            username: 'TestUser2',
            password: 'test456'
        });
        assert(res.statusCode === 200, `Login échoué: ${res.statusCode}`);
        user2Token = res.body.token;
        user2QR = res.body.user.qr_code;
    });

    await test('7. User1 voit Operator', async () => {
        const res = await makeRequest('GET', '/api/contacts', null, user1Token);
        assert(res.statusCode === 200, `Erreur: ${res.statusCode}`);
        const hasOperator = res.body.some(c => c.role === 'OPERATOR');
        assert(hasOperator, 'Operator absent des contacts');
    });

    await test('8. Contact bidirectionnel (User1 -> User2)', async () => {
        const res = await makeRequest('POST', '/api/contacts', {
            qr_code: user2QR
        }, user1Token);
        assert(res.statusCode === 200, `Ajout échoué: ${res.statusCode}`);
    });

    await test('9. User2 a User1 automatiquement', async () => {
        const res = await makeRequest('GET', '/api/contacts', null, user2Token);
        assert(res.statusCode === 200, `Erreur: ${res.statusCode}`);
        const hasUser1 = res.body.some(c => c.username === 'TestUser1');
        assert(hasUser1, 'User1 absent des contacts de User2');
    });

    await test('10. Récupération documents User1', async () => {
        const res = await makeRequest('GET', '/api/documents', null, user1Token);
        assert(res.statusCode === 200, `Erreur: ${res.statusCode}`);
        assert(Array.isArray(res.body), 'Pas un tableau');
    });

    await test('11. Liste utilisateurs (admin)', async () => {
        const res = await makeRequest('GET', '/api/admin/users', null, operatorToken);
        assert(res.statusCode === 200, `Erreur: ${res.statusCode}`);
        assert(res.body.length >= 3, `Seulement ${res.body.length} utilisateurs`);
    });

    await test('12. Modification rôle User1', async () => {
        const res = await makeRequest('PUT', `/api/admin/users/${user1Id}`, {
            role: 'ADMIN'
        }, operatorToken);
        assert(res.statusCode === 200, `Erreur: ${res.statusCode}`);
        assert(res.body.role === 'ADMIN', `Rôle: ${res.body.role}`);
    });

    await test('13. Liste documents (admin)', async () => {
        const res = await makeRequest('GET', '/api/admin/documents', null, operatorToken);
        assert(res.statusCode === 200, `Erreur: ${res.statusCode}`);
    });

    await test('14. Sécurité: PNJ bloqué sur admin', async () => {
        const res = await makeRequest('GET', '/api/admin/users', null, user2Token);
        assert(res.statusCode === 403, `Code: ${res.statusCode} au lieu de 403`);
    });

    await test('15. Sécurité: Sans token = 401', async () => {
        const res = await makeRequest('GET', '/api/contacts');
        assert(res.statusCode === 401, `Code: ${res.statusCode} au lieu de 401`);
    });

    await test('16. Suppression User2', async () => {
        const res = await makeRequest('DELETE', `/api/admin/users/${user2Id}`, null, operatorToken);
        assert(res.statusCode === 200, `Erreur: ${res.statusCode}`);
    });

    await test('17. User2 ne peut plus se connecter', async () => {
        const res = await makeRequest('POST', '/api/login', {
            username: 'TestUser2',
            password: 'test456'
        });
        assert(res.statusCode === 401, `Code: ${res.statusCode} au lieu de 401`);
    });

    // Résumé
    log('\n' + '='.repeat(60));
    log('\n📊 RÉSUMÉ DES TESTS\n');

    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;

    log(`Total: ${testResults.length} tests`);
    log(`✅ Réussis: ${passed}`);
    log(`❌ Échoués: ${failed}`);

    if (failed > 0) {
        log('\n❌ DÉTAILS DES ÉCHECS:');
        testResults.filter(r => r.status === 'FAIL').forEach(r => {
            log(`  - ${r.name}: ${r.error}`);
        });
    }

    log('\n' + '='.repeat(60));

    if (failed === 0) {
        log('\n🎉 TOUS LES TESTS SONT PASSÉS !\n');
    } else {
        log('\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ.\n');
    }

    // Sauvegarder les résultats
    fs.writeFileSync('test-results.txt', detailedLog.join('\n'));
    log('📄 Résultats sauvegardés dans test-results.txt');

    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    log('\n💥 ERREUR CRITIQUE: ' + err.message);
    fs.writeFileSync('test-results.txt', detailedLog.join('\n'));
    process.exit(1);
});
