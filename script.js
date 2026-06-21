// CONFIGURAÇÃO: Insira aqui a URL gerada na implantação do seu Google Apps Script
        // Removemos a constante fixa antiga. Agora a URL será dinâmica.
let URL_API = localStorage.getItem('CONEXAO_SHEETS_URL') || "";

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

// Define as configurações iniciais ao carregar a página
window.addEventListener('DOMContentLoaded', () => {
    const hoje = new Date().toISOString().split('T')[0];
    if(document.getElementById('cad-data')) document.getElementById('cad-data').value = hoje;
    if(document.getElementById('compra-data')) document.getElementById('compra-data').value = hoje;
    if(document.getElementById('venda-data')) document.getElementById('venda-data').value = hoje;
    
    // Se já tiver uma URL salva, mostra no input de configuração e carrega o dashboard
    if (URL_API) {
        document.getElementById('input-url-api').value = URL_API;
        carregarControleGeral();
    } else {
        // Se for a primeira vez, simula o clique na aba de configuração
        openTab(null, 'configuracao');
        document.querySelectorAll('.tab-link').forEach(btn => btn.classList.remove('active'));
        document.querySelector('[onclick*="configuracao"]').classList.add('active');
    }
});

// Salva ou atualiza a URL da API no navegador do usuário
function salvarConfiguracao(e) {
    if(e) e.preventDefault();
    const urlDigitada = document.getElementById('input-url-api').value.trim();
    
    if (!urlDigitada.startsWith("https://script.google.com/")) {
        alert("URL inválida! Certifique-se de que colou o link correto do Google Apps Script.");
        return;
    }
    
    localStorage.setItem('CONEXAO_SHEETS_URL', urlDigitada);
    URL_API = urlDigitada;
    alert("Configuração salva com sucesso!");
    
    // Redireciona automaticamente para o painel principal
    document.querySelector('[onclick*="dashboard"]').click();
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
    const payload = {
        aba: "Compras",
        dados: [
            document.getElementById('compra-data').value,
            document.getElementById('compra-select').value,
            Number(document.getElementById('compra-qtd').value)
        ]
    };
    enviarParaSheets(payload, 'form-compra');
});

document.getElementById('form-venda').addEventListener('submit', function(e) {
    e.preventDefault();
    const payload = {
        aba: "Vendas",
        dados: [
            document.getElementById('venda-data').value,
            document.getElementById('venda-select').value,
            Number(document.getElementById('venda-qtd').value)
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