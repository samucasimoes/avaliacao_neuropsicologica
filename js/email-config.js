/* Configuração do envio por email (Avaliações Concluídas > Enviar por email).
   Os dois ids abaixo não são segredo: só dizem ao Google e à Microsoft qual é o app.
   Deixe vazio o que não for usar: o botão daquele email avisa que falta configurar.
   O passo a passo de como criar cada um está no README.md ("Envio por email"). */

window.EMAIL_CONFIG = {
  /* Google Cloud > APIs e serviços > Credenciais > ID do cliente OAuth (Aplicativo da Web).
     Ex.: "123456789-abc.apps.googleusercontent.com" */
  googleClientId: "",

  /* portal.azure.com > Registros de aplicativo > seu app > "ID do aplicativo (cliente)".
     Ex.: "00000000-0000-0000-0000-000000000000" */
  microsoftClientId: ""
};
