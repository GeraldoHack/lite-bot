/**
 * Este script é responsável
 * pelas funções que
 * serão executadas
 * no Lite Bot.
 *
 * Aqui é onde você
 * vai definir
 * o que o seu bot
 * vai fazer.
 *
 * @author Geraldo
 */
const tabelasPorGrupo = {};
const fs = require("fs"); // Usado para salvar e ler arquivos JSON
// Caminho do arquivo de pagamento
const PAGAMENTO_FILE = 'pagamento.json';

// Função para salvar o pagamento no arquivo
function salvarPagamento(grupoId, texto) {
    try {
        const pagamentos = carregarPagamentos(); // Carrega os pagamentos já salvos
        pagamentos[grupoId] = texto; // Define ou atualiza o pagamento do grupo
        fs.writeFileSync(PAGAMENTO_FILE, JSON.stringify(pagamentos, null, 2), 'utf8'); // Salva os pagamentos no arquivo
    } catch (error) {
        console.error("Erro ao salvar pagamento:", error);
    }
}

// Função para carregar os pagamentos salvos
function carregarPagamentos() {
    try {
        if (!fs.existsSync(PAGAMENTO_FILE)) {
            return {}; // Se o arquivo não existir, retorna um objeto vazio
        }
        const data = fs.readFileSync(PAGAMENTO_FILE, 'utf8'); // Lê o conteúdo do arquivo
        return JSON.parse(data); // Retorna os pagamentos como um objeto
    } catch (error) {
        console.error("Erro ao carregar pagamentos:", error);
        return {}; // Retorna um objeto vazio se houver erro
    }
}

// Função para obter o pagamento salvo de um grupo
function obterPagamento(grupoId) {
    const pagamentos = carregarPagamentos(); // Carrega os pagamentos salvos
    return pagamentos[grupoId]; // Retorna o pagamento para o grupo, ou undefined se não existir
}
// Função para salvar a tabela no arquivo
function salvarTabela(grupoId, texto) {
    const tabelas = carregarTabelas(); // Carrega as tabelas já salvas
    tabelas[grupoId] = texto; // Define ou atualiza a tabela do grupo
    fs.writeFileSync('tabelas.json', JSON.stringify(tabelas, null, 2), 'utf8'); // Salva todas as tabelas no arquivo
}

// Função para carregar as tabelas salvas
function carregarTabelas() {
    try {
        const data = fs.readFileSync('tabelas.json', 'utf8'); // Lê o conteúdo do arquivo
        return JSON.parse(data); // Retorna as tabelas como um objeto
    } catch (error) {
        return {}; // Se o arquivo não existir ou não puder ser lido, retorna um objeto vazio
    }
}

// Função para obter a tabela salva de um grupo
function obterTabela(grupoId) {
    const tabelas = carregarTabelas(); // Carrega as tabelas salvas
    return tabelas[grupoId]; // Retorna a tabela para o grupo, ou undefined se não existir
}

const path = require("node:path");
const { menu } = require("./utils/menu");
const { ASSETS_DIR, BOT_NUMBER, SPIDER_API_TOKEN } = require("./config");
const { errorLog } = require("./utils/terminal");
const {
  attp,
  ttp,
  gpt4,
  playAudio,
  playVideo,
} = require("./services/spider-x-api");
const { consultarCep } = require("correios-brasil/dist");
const { image } = require("./services/hercai");

const {
  InvalidParameterError,
  WarningError,
  DangerError,
} = require("./errors");

const {
  checkPrefix,
  deleteTempFile,
  download,
  formatCommand,
  getBuffer,
  getContent,
  getJSON,
  getProfileImageData,
  getRandomName,
  getRandomNumber,
  isLink,
  loadLiteFunctions,
  onlyLettersAndNumbers,
  onlyNumbers,
  removeAccentsAndSpecialCharacters,
  splitByCharacters,
  toUserJid,
} = require("./utils/functions");

const {
  activateAntiLinkGroup,
  deactivateAntiLinkGroup,
  isActiveAntiLinkGroup,
  activateWelcomeGroup,
  isActiveGroup,
  deactivateWelcomeGroup,
  activateGroup,
  deactivateGroup,
} = require("./database/db");

async function runLite({ socket, data }) {
  const functions = loadLiteFunctions({ socket, data });

  if (!functions) {
    return;
  }

  const {
    args,
    body,
    command,
    from,
    fullArgs,
    info,
    isImage,
    isReply,
    isSticker,
    isVideo,
    lite,
    prefix,
    replyJid,
    userJid,
    audioFromURL,
    ban,
    downloadImage,
    downloadSticker,
    downloadVideo,
    errorReact,
    errorReply,
    imageFromFile,
    imageFromURL,
    isAdmin,
    isOwner,
    react,
    recordState,
    reply,
    sendText,
    stickerFromFile,
    stickerFromInfo,
    stickerFromURL,
    successReact,
    successReply,
    typingState,
    videoFromURL,
    waitReact,
    waitReply,
    warningReact,
    warningReply,
  } = functions;

  if (!isActiveGroup(from) && !(await isOwner(userJid))) {
    return;
  }

  if (!checkPrefix(prefix)) {
    /**
     * ⏩ Um auto responder simples ⏪
     *
     * Se a mensagem incluir a palavra
     * (ignora maiúsculas e minúsculas) use:
     * body.toLowerCase().includes("palavra")
     *
     * Se a mensagem for exatamente igual a
     * palavra (ignora maiúsculas e minúsculas) use:
     * body.toLowerCase() === "palavra"
     */
    if (body.toLowerCase().includes("gado")) {
      await reply("Você é o gadão guerreiro!");
      return;
    }

    if (body === "salve") {
      await reply("Salve, salve!");
      return;
    }

    // ⬇ Coloque mais respostas do auto-responder abaixo ⬇

    // ⬆ Coloque mais respostas do auto-responder acima ⬆
  }

  /**
   * 🚫 Anti-link 🔗
   */
  if (
  !checkPrefix(prefix) &&
  isActiveAntiLinkGroup(from) &&
  isLink(body) &&
  !(await isAdmin(userJid))
) {
  // Deletar automaticamente a mensagem com link
  const stanzaId = info.key.id;
  const participant = info.key.participant || userJid;

  if (stanzaId && participant) {
    await socket.sendMessage(from, {
      delete: {
        remoteJid: from,
        fromMe: false,
        id: stanzaId,
        participant: participant,
      }
    });
  }

  // Extrair o número do membro
  const memberNumber = userJid.replace(/\D/g, "");

  // Avisar com menção
  await reply(
    `*Link detectado* e o membro @${memberNumber} *será removido*.\n\n*Reflita e volte melhor.*`,
    { mentions: [userJid] }
  );

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Banir o usuário
  await ban(from, userJid);

  return;
}

  /**
   * Se não houver um
   * prefixo, não faça nada.
   */
  if (!checkPrefix(prefix)) {
    return;
  }

  try {
    /**
     * Aqui você vai definir
     * as funções que
     * o seu bot vai executar via "cases".
     *
     * ⚠ ATENÇÃO ⚠: Não traga funções
     * ou "cases" de
     * outros bots para cá
     * sem saber o que está fazendo.
     *
     * Cada bot tem suas
     * particularidades e,
     * por isso, é importante
     * tomar cuidado.
     * Não nos responsabilizamos
     * por problemas
     * que possam ocorrer ao
     * trazer códigos de outros
     * bots pra cá,
     * na tentativa de adaptação.
     *
     * Toda ajuda será *COBRADA*
     * caso sua intenção
     * seja adaptar os códigos
     * de outro bot para este.
     *
     * ✅ CASES ✅
     */
    switch (removeAccentsAndSpecialCharacters(command?.toLowerCase())) {
      case "antilink":
        if (!args.length) {
          throw new InvalidParameterError(
            "Você precisa digitar 1 ou 0 (ligar ou desligar)!"
          );
        }

        const antiLinkOn = args[0] === "1";
        const antiLinkOff = args[0] === "0";

        if (!antiLinkOn && !antiLinkOff) {
          throw new InvalidParameterError(
            "Você precisa digitar 1 ou 0 (ligar ou desligar)!"
          );
        }

        if (antiLinkOn) {
          activateAntiLinkGroup(from);
        } else {
          deactivateAntiLinkGroup(from);
        }

        await successReact();

        const antiLinkContext = antiLinkOn ? "ativado" : "desativado";

        await reply(`Recurso de anti-link ${antiLinkContext} com sucesso!`);
        break;
       case 'fechargp':
          if (!(await isAdmin(userJid))) {
            throw new DangerError(
              "Você não tem permissão para executar este comando!"
            );
          }
        lite.groupSettingUpdate(from, "announcement")
        reply("Como pedido Senhor, o grupo foi *fechado* com sucesso.");
        await successReact();
        break;
        case 'abrirgp':
          if (!(await isAdmin(userJid))) {
            throw new DangerError(
              "Você não tem permissão para executar este comando!"
            );
          }
        lite.groupSettingUpdate(from, "not_announcement")
        reply("Como pedido Senhor, o grupo foi *aberto* com sucesso.");
        await successReact();
        break;
      case "attp":
        if (!args.length) {
          throw new InvalidParameterError(
            "Você precisa informar o texto que deseja transformar em figurinha."
          );
        }

        await waitReact();

        const attpUrl = await attp(fullArgs.trim());

        await successReact();

        await stickerFromURL(attpUrl);
        break;
      case "ban":
      case "banir":
      case "kick":
        if (!(await isAdmin(userJid))) {
          throw new DangerError(
            "Você não tem permissão para executar este comando!"
          );
        }

        if (!args.length && !isReply) {
          throw new InvalidParameterError(
            "Você precisa mencionar ou marcar um membro!"
          );
        }

        const memberToRemoveJid = isReply ? replyJid : toUserJid(args[0]);
        const memberToRemoveNumber = onlyNumbers(memberToRemoveJid);

        if (
          memberToRemoveNumber.length < 7 ||
          memberToRemoveNumber.length > 15
        ) {
          throw new InvalidParameterError("Número inválido!");
        }

        if (memberToRemoveJid === userJid) {
          throw new DangerError("Você não pode remover você mesmo!");
        }

        const botJid = toUserJid(BOT_NUMBER);

        if (memberToRemoveJid === botJid) {
          throw new DangerError("Você não pode me remover!");
        }

        await ban(from, memberToRemoveJid);

        await successReact();

        await reply("Membro removido com sucesso!");
        break;
    switch (removeAccentsAndSpecialCharacters(command?.toLowerCase())) {
    case "deft":
        // Verificar se o usuário é ADM
        if (!(await isAdmin(userJid))) {
            throw new DangerError("Você não tem permissão para executar este comando!");
        }

        // Verificar se o comando contém o texto a ser salvo
        if (!args.length) {
            return reply("❌ Uso correto: deft <texto>");
        }

        // Salvar o texto para o grupo específico
        const grupoIdSet = from; // ID do grupo atual
        const conteudoTexto = args.join(" "); // Texto completo fornecido pelo usuário

        // Salva ou atualiza a tabela no arquivo
        salvarTabela(grupoIdSet, conteudoTexto);

        // Resposta de confirmação
        reply("✅ A Tabela foi *salva* com sucesso, Senhor!");
        break;

    case "tabela":
        // Obter o ID do grupo atual
        const grupoIdTabela = from;

        // Obter a tabela salva para o grupo atual
        const resultado = obterTabela(grupoIdTabela);

        if (!resultado) {
            return reply("❌ Nenhuma tabela foi definida para este grupo ainda!");
        }

        // Resposta com o texto encontrado
        reply(`*📜 A Tabela de megas do grupo:* \n\n${resultado} \n\nPara ver as formas de pagamento digite: *.pagamento*`);
        break;
      switch (removeAccentsAndSpecialCharacters(command?.toLowerCase())) {
    case "defp":
        console.log("Comando setpagamento detectado.");
        
        // Verificar se o usuário é ADM
        if (!(await isAdmin(userJid))) {
            throw new DangerError("Você não tem permissão para executar este comando!");
        }

        // Verificar se o comando contém o texto a ser salvo
        if (!args.length) {
            return reply("❌ Uso correto: setpagamento <informação>");
        }

        // Salvar o pagamento para o grupo específico
        const grupoIdSet = from; // ID do grupo atual
        const conteudoTexto = args.join(" "); // Texto completo fornecido pelo usuário

        // Salva ou atualiza o pagamento no arquivo
        salvarPagamento(grupoIdSet, conteudoTexto);

        // Resposta de confirmação
        reply("✅ O pagamento foi *salvo* com sucesso, Senhor!");
        break;
          case "pagamento":
        console.log("Comando pagamento detectado.");
        
        // Obter o ID do grupo atual
        const grupoIdPagamento = from;

        // Obter o pagamento salvo para o grupo atual
        const resultado = obterPagamento(grupoIdPagamento);

        if (!resultado) {
            return reply("❌ Nenhuma informação de pagamento foi definida para este grupo ainda!");
        }

        // Resposta com a informação encontrada
        reply(`*💰 Confira:* \n\n${resultado}`);
        break;

    default:
        console.log("Comando não reconhecido:", command);
}
      case "cep":
        const cep = args[0];

        if (!cep || ![8, 9].includes(cep.length)) {
          throw new InvalidParameterError(
            "Você precisa enviar um CEP no formato 00000-000 ou 00000000!"
          );
        }

        const data = await consultarCep(cep);

        if (!data.cep) {
          await warningReply("CEP não encontrado!");
          return;
        }

        await successReply(`*Resultado*
        
*CEP*: ${data.cep}
*Logradouro*: ${data.logradouro}
*Complemento*: ${data.complemento}
*Bairro*: ${data.bairro}
*Localidade*: ${data.localidade}
*UF*: ${data.uf}
*IBGE*: ${data.ibge}`);
        break;
      case "gpt4":
      case "gpt":
      case "ia":
      case "lite":
        const text = args[0];

        if (!text) {
          throw new InvalidParameterError(
            "Você precisa me dizer o que eu devo responder!"
          );
        }

        await waitReact();

        const responseText = await gpt4(text);

        await successReply(responseText);
        break;
      case "hidetag":
case "tagall":
case "marcar":
  if (!(await isAdmin(userJid))) {
    throw new DangerError("Você não tem permissão para usar este comando!");
  }

  if (!(await isAdmin(toUserJid(BOT_NUMBER)))) {
    throw new DangerError("O bot precisa ser administrador para mencionar todos!");
  }

  // Apagar a mensagem do comando
  const hidetagStanzaId = info.key.id;
  const hidetagParticipant = info.key.participant || userJid;

  if (!hidetagStanzaId || !hidetagParticipant) {
    throw new DangerError("Erro ao identificar a mensagem a ser apagada!");
  }

  await socket.sendMessage(from, {
    delete: {
      remoteJid: from,
      fromMe: false,
      id: hidetagStanzaId,
      participant: hidetagParticipant
    }
  });

  // Mencionar todos
  const { participants } = await lite.groupMetadata(from);
  const mentions = participants.map(({ id }) => id);

  await react("📢");
  await sendText(`*📢*!\n\n${fullArgs}`, mentions);
  break;
      case "menu":
        await successReact();
        await imageFromFile(
          path.join(ASSETS_DIR, "images", "menu.png"),
          `\n\n${menu()}`
        );
        break;
      case "off":
        if (!(await isOwner(userJid))) {
          throw new DangerError(
            "Você não tem permissão para executar este comando!"
          );
        }

        deactivateGroup(from);

        await successReply("Bot desativado no grupo!");
        break;
      case "image":
        if (!fullArgs.length) {
          throw new WarningError(
            "Por favor, forneça uma descrição para gerar a imagem."
          );
        }

        await waitReact();

        const response = await image(fullArgs);

        await successReact();

        await imageFromURL(response.url);
        break;
      case "on":
        if (!(await isOwner(userJid))) {
          throw new DangerError(
            "Você não tem permissão para executar este comando!"
          );
        }

        activateGroup(from);

        await successReply("Bot ativado no grupo!");
        break;
      case "ping":
        await react("🏓");
        await reply("🏓 Pong!");
        break;
      case "playaudio":
      case "playyt":
      case "play":
        if (!args.length) {
          throw new InvalidParameterError(
            "Você precisa me dizer o que deseja buscar!"
          );
        }

        await waitReact();

        const playAudioData = await playAudio(fullArgs);

        if (!playAudioData) {
          await errorReply("Nenhum resultado encontrado!");
          return;
        }

        await successReact();

        await audioFromURL(playAudioData.url);

        break;
      case "playvideo":
        if (!args.length) {
          throw new InvalidParameterError(
            "Você precisa me dizer o que deseja buscar!"
          );
        }

        await waitReact();

        const playVideoData = await playVideo(args[0]);

        if (!playVideoData) {
          await errorReply("Nenhum resultado encontrado!");
          return;
        }

        await successReact();

        await videoFromURL(playVideoData.url);

        break;
      case "sticker":
      case "f":
      case "fig":
      case "figu":
      case "s":
        if (!isImage && !isVideo) {
          throw new InvalidParameterError(
            "Você precisa marcar uma imagem/gif/vídeo ou responder a uma imagem/gif/vídeo"
          );
        }

        await waitReact();
        await stickerFromInfo(info);
        break;
      case "welcome":
      case "bemvindo":
      case "boasvinda":
      case "boasvindas":
      case "boavinda":
      case "boavindas":
        if (!args.length) {
          throw new InvalidParameterError(
            "Você precisa digitar 1 ou 0 (ligar ou desligar)!"
          );
        }

        const welcome = args[0] === "1";
        const notWelcome = args[0] === "0";

        if (!welcome && !notWelcome) {
          throw new InvalidParameterError(
            "Você precisa digitar 1 ou 0 (ligar ou desligar)!"
          );
        }

        if (welcome) {
          activateWelcomeGroup(from);
        } else {
          deactivateWelcomeGroup(from);
        }

        await successReact();

        const welcomeContext = welcome ? "ativado" : "desativado";

        await reply(`Recurso de boas-vindas ${welcomeContext} com sucesso!`);
        break;
      case "ttp":
        if (!args.length) {
          throw new InvalidParameterError(
            "Você precisa informar o texto que deseja transformar em figurinha."
          );
        }

        await waitReact();

        const ttpUrl = await ttp(fullArgs.trim());

        await successReact();

        await stickerFromURL(ttpUrl);
        break;
    }
    // ❌ Não coloque nada abaixo ❌
  } catch (error) {
    /**
     * ❌ Não coloque nada abaixo ❌
     * Este bloco é responsável por tratar
     * os erros que ocorrerem durante a execução
     * das "cases".
     */
    if (error instanceof InvalidParameterError) {
      await warningReply(`Parâmetros inválidos! ${error.message}`);
    } else if (error instanceof WarningError) {
      await warningReply(error.message);
    } else if (error instanceof DangerError) {
      await errorReply(error.message);
    } else {
      errorLog(`Erro ao executar comando!\n\nDetalhes: ${error.message}`);

      await errorReply(
        `Ocorreu um erro ao executar o comando ${command.name}!

📄 *Detalhes*: ${error.message}`
      );
    }
    // ❌ Não coloque nada abaixo ❌
  }
}

module.exports = { runLite };
