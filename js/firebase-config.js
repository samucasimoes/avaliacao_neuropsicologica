/* Configuração do Firebase.
   Onde pegar: console.firebase.google.com > seu projeto > ícone de engrenagem
   > Configurações do projeto > Seus apps > app da Web (</>) > "Configuração do SDK" > "Config".
   Copie os valores para cá. Eles não são segredo: quem protege os dados são as regras
   do Firestore (arquivo firestore.rules) e o login. */

window.FIREBASE_CONFIG = {
  apiKey: "COLE_AQUI_A_API_KEY",
  authDomain: "SEU-PROJETO.firebaseapp.com",
  projectId: "SEU-PROJETO",
  storageBucket: "SEU-PROJETO.appspot.com",
  messagingSenderId: "000000000000",
  appId: "COLE_AQUI_O_APP_ID"
};
