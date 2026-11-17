// Configuração do sistema de vistoria.
// Deixe vazio para usar o MODO DEMONSTRAÇÃO (dados ficam só neste navegador).
// Depois de criar o projeto no Supabase, cole aqui:
//   Supabase > Project Settings > API > Project URL  e  anon public key
window.VISTORIA_CONFIG = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
  EMPREENDIMENTO_PADRAO: "Residencial São Lucas",
  // Login curto: a pessoa digita só "ricardo" e o sistema completa com este domínio.
  DOMINIO_LOGIN: "vistoria.construfase.com.br",
  // IA paga (Anthropic) para sugerir soluções. false = custo zero: a sugestão sai da base de soluções.
  // Para ligar depois: siga o passo "IA" do LEIA-ME e troque para true.
  IA: false,
  // Impressão do Termo de Vistoria (FS010-02) com as ocorrências. Deixe false até ter impressora na obra.
  TERMO_IMPRESSO: false
};
