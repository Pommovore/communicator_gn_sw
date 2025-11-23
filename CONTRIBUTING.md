# Contributing to Antigravity

Merci de votre intérêt pour contribuer à Antigravity ! 🎉

## 📋 Comment Contribuer

### 1. Fork le Projet

Cliquez sur le bouton "Fork" en haut à droite de la page GitHub.

### 2. Cloner Votre Fork

```bash
git clone https://github.com/VOTRE_USERNAME/communicator_gn_sw.git
cd communicator_gn_sw
```

### 3. Créer une Branche

```bash
git checkout -b feature/ma-nouvelle-fonctionnalite
```

### 4. Faire vos Modifications

- Suivez les conventions de code existantes
- Commentez votre code si nécessaire
- Testez vos modifications localement

### 5. Commit

Utilisez des messages de commit descriptifs :

```bash
git commit -m "feat: ajouter fonctionnalité X"
```

**Convention de messages** :
- `feat:` nouvelle fonctionnalité
- `fix:` correction de bug
- `docs:` modification documentation
- `style:` formatage (pas de changement logique)
- `refactor:` refactorisation
- `test:` ajout/modification tests
- `chore:` tâches maintenance

### 6. Push vers Votre Fork

```bash
git push origin feature/ma-nouvelle-fonctionnalite
```

### 7. Créer une Pull Request

1. Allez sur votre fork sur GitHub
2. Cliquez sur "Pull Request"
3. Décrivez vos modifications
4. Soumettez la PR

---

## 🧪 Tests

Avant de soumettre une PR, assurez-vous que tous les tests passent :

```bash
# Lancer les tests fonctionnels
node test-functional.js

# Tester la protection Operator
node test-operator-protection.js
```

Tous les tests doivent passer (17/17).

---

## 📝 Standards de Code

### JavaScript/React

- Utiliser ES6+ (const, let, arrow functions)
- Indentation : 2 espaces
- Pas de point-virgule (sauf si nécessaire)
- Noms de variables : camelCase
- Noms de composants : PascalCase

### CSS

- Utiliser les variables CSS existantes
- Préfixer les classes spécifiques : `.sw-*`
- Mobile-first approach

### Commits

- Messages en anglais ou français
- Format : `type: description courte`
- Corps du message si nécessaire

---

## 🐛 Rapporter un Bug

1. Vérifiez que le bug n'a pas déjà été rapporté
2. Créez une issue avec :
   - Description claire du problème
   - Étapes pour reproduire
   - Comportement attendu vs actuel
   - Captures d'écran si pertinent
   - Environnement (OS, Node version, etc.)

---

## 💡 Proposer une Fonctionnalité

1. Créez une issue "Feature Request"
2. Décrivez :
   - Le problème que ça résout
   - La solution proposée
   - Des alternatives considérées
   - Impact sur l'existant

---

## 🔍 Code Review

Toutes les PR seront reviewées. Soyez patient et ouvert aux suggestions.

### Critères d'Acceptation

- ✅ Code propre et lisible
- ✅ Tests passent
- ✅ Documentation à jour
- ✅ Pas de régression
- ✅ Suit les conventions du projet

---

## 📚 Ressources

- [README.md](README.md) - Documentation principale
- [USER-MANAGEMENT.md](USER-MANAGEMENT.md) - Architecture
- [VALIDATION-REPORT.md](VALIDATION-REPORT.md) - Tests
- [PROJECT-SUMMARY.md](PROJECT-SUMMARY.md) - Vue d'ensemble

---

## 🙏 Remerciements

Merci de contribuer à rendre Antigravity meilleur !

---

## 📞 Questions ?

Ouvrez une issue ou contactez les mainteneurs.

---

*Dernière mise à jour : 2025-11-23*
