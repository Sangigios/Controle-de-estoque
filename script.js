 // CONFIGURAÇÃO: Insira aqui a URL gerada na implantação do seu Google Apps Script
        // Removemos a constante fixa antiga. Agora a URL será dinâmica.
let URL_API = localStorage.getItem('CONEXAO_SHEETS_URL') || "";
let URL_PLANILHA = localStorage.getItem('LINK_PLANILHA_URL') || ""; // <--- Nova variável

// Sistema de alternância de abas front-end
function openTab(evt, tabName) {
    // Se não houver API configurada, força o usuário a ir para a aba de configurações
    if (!URL_API && tabName !== 'configuracao') {
        alert("Por favor, configure a URL do seu Google Apps Script primeiro!");
        openTab(evt, 'configuracao');
        // Ajusta o destaque visual dos botões do menu
        document.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[onclick*="configuracao"]').classList.add('active');
        return;
    }

    const tabContents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < tabContents.length; i++) {
        tabContents[i].classList.remove("active");
    }

    const tabLinks = document.getElementsByClassName("tab-link");
    for (let i = 0; i < tabLinks.length; i++) {
        tabLinks[i].classList.remove("active");
    }

    document.getElementById(tabName).classList.add("active");
    if(evt) evt.currentTarget.classList.add("active");

    // Ações extras ao abrir abas específicas
    if (tabName === 'compras' || tabName === 'vendas') {
        carregarSelectProdutos();
    } else if (tabName === 'dashboard') {
        carregarControleGeral();
    }
}

// Atualize a função de inicialização da página
window.addEventListener('DOMContentLoaded', () => {
    const hoje = new Date().toISOString().split('T')[0];
    if(document.getElementById('cad-data')) document.getElementById('cad-data').value = hoje;
    if(document.getElementById('compra-data')) document.getElementById('compra-data').value = hoje;
    if(document.getElementById('venda-data')) document.getElementById('venda-data').value = hoje;
    
    // Se já tiver dados salvos, preenche os inputs e carrega o painel
    if (URL_API) {
        document.getElementById('input-url-api').value = URL_API;
        if(URL_PLANILHA) document.getElementById('input-url-planilha').value = URL_PLANILHA;
        carregarControleGeral();
    } else {
        openTab(null, 'configuracao');
        document.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[onclick*="configuracao"]').classList.add('active');
    }
});

// Atualize a função de salvar as configurações
function salvarConfiguracao(e) {
    if(e) e.preventDefault();
    const urlDigitada = document.getElementById('input-url-api').value.trim();
    const planilhaDigitada = document.getElementById('input-url-planilha').value.trim();
    
    if (!urlDigitada.startsWith("https://script.google.com/")) {
        alert("URL de API inválida! Certifique-se de que colou o link correto do Google Apps Script.");
        return;
    }
    
    // Salva a API e o Link da Planilha na memória local
    localStorage.setItem('CONEXAO_SHEETS_URL', urlDigitada);
    localStorage.setItem('LINK_PLANILHA_URL', planilhaDigitada);
    
    URL_API = urlDigitada;
    URL_PLANILHA = planilhaDigitada;
    
    alert("Configurações salvas com sucesso!");
    document.querySelector('[onclick*="dashboard"]').click();
}

// ADICIONE ESTA NOVA FUNÇÃO NO SEU SCRIPT
function abrirPlanilhaBancoDeDados() {
    if (!URL_PLANILHA) {
        alert("Você ainda não cadastrou o link da sua planilha na aba de Configurações!");
        // Redireciona para a aba de configurações
        document.querySelector('[onclick*="configuracao"]').click();
        return;
    }
    // Abre a planilha em uma nova aba do navegador com segurança
    window.open(URL_PLANILHA, '_blank');
}

// Carrega a lista de produtos cadastrados nos elementos <select>
function carregarSelectProdutos() {
    if(!URL_API) return;

    fetch(`${URL_API}?acao=produtos`)
        .then(res => res.json())
        .then(produtos => {
            const selectCompra = document.getElementById('compra-select');
            const selectVenda = document.getElementById('venda-select');
            
            let options = '<option value="">-- Escolha um Produto --</option>';
            produtos.forEach(prod => {
                options += `<option value="${prod}">${prod}</option>`;
            });
            
            selectCompra.innerHTML = options;
            selectVenda.innerHTML = options;
        })
        .catch(err => console.error("Erro ao carregar produtos:", err));
}

// Função que busca o preço atual do produto selecionado no catálogo do Sheets
function atualizarPrecoVendaSugerido() {
    const produtoSelecionado = document.getElementById('venda-select').value;
    const inputValor = document.getElementById('venda-valor');
    
    if (!produtoSelecionado || !URL_API) {
        inputValor.value = "";
        return;
    }
    
    // Faz uma requisição rápida para saber os detalhes dos produtos
    // Como o nosso doGet padrão retorna o controle geral, vamos fazer uma busca simples no Sheets
    // Para simplificar e economizar requisições, faremos o Apps Script nos devolver o catálogo atualizado
    fetch(`${URL_API}?acao=precos_venda`)
        .then(res => res.json())
        .then(catalogoPrecos => {
            const prodMin = produtoSelecionado.trim().toLowerCase();
            if (catalogoPrecos[prodMin]) {
                inputValor.value = catalogoPrecos[prodMin];
            } else {
                inputValor.value = "";
            }
        })
        .catch(err => console.error("Erro ao buscar preço sugerido:", err));
}

// Carrega e renderiza a tabela de Controle Geral
function carregarControleGeral() {
    if(!URL_API) return;

    const tbody = document.getElementById('tbody-controle');
    tbody.innerHTML = '<tr><td colspan="7" class="loading-text">Buscando dados consolidados...</td></tr>';

    fetch(URL_API)
        .then(res => res.json())
        .then(dados => {
            if(dados.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="loading-text">Nenhum registro de movimentação encontrado.</td></tr>';
                return;
            }

            let html = '';
            dados.forEach(row => {
                html += `<tr>
                    <td>${row.data}</td>
                    <strong><td>${row.produto}</td></strong>
                    <td>${row.estoque}</td>
                    <td>${row.vendaDiaria}</td>
                    <td>R$ ${Number(row.lucroDiaria).toFixed(2)}</td>
                    <td>${row.vendaMes}</td>
                    <td>R$ ${Number(row.lucroMes).toFixed(2)}</td>
                </tr>`;
            });
            tbody.innerHTML = html;
        })
        .catch(err => {
            console.error("Erro ao obter controle geral:", err);
            tbody.innerHTML = '<tr><td colspan="7" class="loading-text" style="color:red;">Erro ao conectar com o banco de dados. Verifique sua URL cadastrada.</td></tr>';
        });
}

// Eventos de envio dos formulários
document.getElementById('form-cadastro').addEventListener('submit', function(e) {
    e.preventDefault();
    const payload = {
        aba: "Cadastrar Produtos",
        dados: [
            document.getElementById('cad-data').value,
            document.getElementById('cad-produto').value,
            Number(document.getElementById('cad-valor-compra').value),
            Number(document.getElementById('cad-valor-venda').value)
        ]
    };
    enviarParaSheets(payload, 'form-cadastro');
});

document.getElementById('form-compra').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const data = document.getElementById('compra-data').value;
    const produto = document.getElementById('compra-select').value;
    const qtd = Number(document.getElementById('compra-qtd').value);
    const valorCompra = Number(document.getElementById('compra-valor').value); // <--- Captura o novo campo
    const fornecedor = document.getElementById('compra-fornecedor').value.trim();

    const payload = {
        aba: "Compras",
        dados: [
            data,          // Coluna B da planilha (pois a coluna A é o ID gerado pelo Script)
            produto,       // Coluna C
            qtd,           // Coluna D
            valorCompra,   // Coluna E (Valor Compra)
            fornecedor     // Coluna F (Fornecedor)
        ]
    };
    
    enviarParaSheets(payload, 'form-compra');
});

document.getElementById('form-venda').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const data = document.getElementById('venda-data').value;
    const produto = document.getElementById('venda-select').value;
    const qtd = Number(document.getElementById('venda-qtd').value);
    const valorVenda = Number(document.getElementById('venda-valor').value); // <--- Captura o valor da venda

    const payload = {
        aba: "Vendas",
        dados: [
            data,       // Coluna A
            produto,    // Coluna B
            qtd,        // Coluna C
            valorVenda  // Coluna D (Novo campo enviado)
        ]
    };
    
    enviarParaSheets(payload, 'form-venda');
});

function enviarParaSheets(payload, formId) {
    if(!URL_API) {
        alert("Erro: Configure a URL da sua API antes de enviar.");
        return;
    }

    fetch(URL_API, {
        method: 'POST',
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(res => {
        if(res.status === 'sucesso') {
            alert('Lançamento registrado com sucesso!');
            document.getElementById(formId).reset();
            document.getElementById(formId).querySelector('input[type="date"]').value = new Date().toISOString().split('T')[0];
        } else {
            alert('Erro retornado: ' + res.mensagem);
        }
    })
    .catch(err => {
        console.error(err);
        alert('Falha na comunicação com o Google Sheets.');
    });
}