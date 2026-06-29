let URL_API = localStorage.getItem('CONEXAO_SHEETS_URL') || "";
        let URL_PLANILHA = localStorage.getItem('LINK_PLANILHA_URL') || "";

        function openTab(evt, tabName) {
            if (!URL_API && tabName !== 'configuracao') {
                alert("Por favor, configure a URL do seu Google Apps Script primeiro!");
                openTab(evt, 'configuracao');
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

            if (tabName === 'compras' || tabName === 'vendas' || tabName === 'fiados') {
                carregarSelectProdutos();
                if(tabName === 'fiados') carregarTabelaFiados();
            } else if (tabName === 'dashboard') {
                carregarControleGeral();
            }
        }

        window.addEventListener('DOMContentLoaded', () => {
            const hoje = new Date().toISOString().split('T')[0];
            if(document.getElementById('cad-data')) document.getElementById('cad-data').value = hoje;
            if(document.getElementById('compra-data')) document.getElementById('compra-data').value = hoje;
            if(document.getElementById('venda-data')) document.getElementById('venda-data').value = hoje;
            if(document.getElementById('fiado-data-compra')) document.getElementById('fiado-data-compra').value = hoje;
            
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

        function salvarConfiguracao(e) {
            if(e) e.preventDefault();
            const urlDigitada = document.getElementById('input-url-api').value.trim();
            const planilhaDigitada = document.getElementById('input-url-planilha').value.trim();
            
            if (!urlDigitada.startsWith("https://script.google.com/")) {
                alert("URL de API inválida! Certifique-se de que colou o link correto do Google Apps Script.");
                return;
            }
            
            localStorage.setItem('CONEXAO_SHEETS_URL', urlDigitada);
            localStorage.setItem('LINK_PLANILHA_URL', planilhaDigitada);
            
            URL_API = urlDigitada;
            URL_PLANILHA = planilhaDigitada;
            
            alert("Configurações salvas com sucesso!");
            document.querySelector('[onclick*="dashboard"]').click();
        }

        function abrirPlanilhaBancoDeDados() {
            if (!URL_PLANILHA) {
                alert("Você ainda não cadastrou o link da sua planilha na aba de Configurações!");
                document.querySelector('[onclick*="configuracao"]').click();
                return;
            }
            window.open(URL_PLANILHA, '_blank');
        }

        function carregarSelectProdutos() {
            if(!URL_API) return;

            fetch(`${URL_API}?acao=produtos`)
                .then(res => res.json())
                .then(produtos => {
                    const selectCompra = document.getElementById('compra-select');
                    const selectVenda = document.getElementById('venda-select');
                    const selectFiado = document.getElementById('fiado-select');
                    
                    let options = '<option value="">-- Escolha um Produto --</option>';
                    produtos.forEach(prod => {
                        options += `<option value="${prod}">${prod}</option>`;
                    });
                    
                    selectCompra.innerHTML = options;
                    selectVenda.innerHTML = options;
                    selectFiado.innerHTML = options;
                })
                .catch(err => console.error("Erro ao carregar produtos:", err));
        }

        function atualizarPrecoVendaSugerido(selectId, inputId) {
            const produtoSelecionado = document.getElementById(selectId).value;
            const inputValor = document.getElementById(inputId);
            
            if (!produtoSelecionado || !URL_API) {
                inputValor.value = "";
                return;
            }
            
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
                            <td><strong>${row.produto}</strong></td>
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

        // Função para buscar os dados de fiados salvos na planilha
        function carregarTabelaFiados() {
            if(!URL_API) return;
            const tbody = document.getElementById('tbody-fiados');
            tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Buscando caderno de fiados...</td></tr>'; // Ajustado para 8

            fetch(`${URL_API}?acao=listar_fiados`)
                .then(res => res.json())
                .then(fiados => {
                    if(fiados.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="8" class="loading-text">Nenhum fiado pendente ou registrado.</td></tr>'; // Ajustado para 8
                        return;
                    }

                    let html = '';
                    fiados.forEach(f => {
                        const isPago = f.status.toLowerCase() === 'pago';
                        const badgeClass = isPago ? 'badge-pago' : 'badge-pendente';
                        const acaoBotao = isPago ? '---' : `<button class="btn-action" onclick="quitarFiadoNoSheets('${f.id}')">Dar Baixa</button>`;
                        
                        // O ID continua sendo usado no botão "Dar Baixa", mas não aparece mais na linha
                        html += `<tr>
                            <td>${f.dataCompra}</td>
                            <td>${f.cliente}</td>
                            <td>${f.produto} (${f.qtd})</td>
                            <td>R$ ${Number(f.valorTotal).toFixed(2)}</td>
                            <td>${f.previsaoPgto}</td>
                            <td>${f.dataPgto || '---'}</td>
                            <td><span class="badge ${badgeClass}">${f.status}</span></td>
                            <td>${acaoBotao}</td>
                        </tr>`;
                    });
                    tbody.innerHTML = html;
                })
                .catch(err => {
                    console.error(err);
                    tbody.innerHTML = '<tr><td colspan="8" class="loading-text" style="color:red;">Erro ao carregar os fiados do Sheets.</td></tr>'; // Ajustado para 8
                });
        }

        // Executa a quitação de uma conta de fiado diretamente na API
        function quitarFiadoNoSheets(idFiado) {
            const dataPagamento = prompt("Confirme a data de pagamento (AAAA-MM-DD):", new Date().toISOString().split('T')[0]);
            if(!dataPagamento) return;

            const payload = {
                aba: "Quitar Fiado",
                dados: [idFiado, dataPagamento]
            };

            fetch(URL_API, {
                method: 'POST',
                body: JSON.stringify(payload)
            })
            .then(res => res.json())
            .then(res => {
                if(res.status === 'sucesso') {
                    alert('Baixa de fiado registrada e lucro computado!');
                    carregarTabelaFiados();
                } else {
                    alert('Erro ao dar baixa: ' + res.mensagem);
                }
            })
            .catch(err => alert('Falha ao se comunicar com o servidor.'));
        }

        // Eventos de envio dos formulários
        document.getElementById('form-cadastro').addEventListener('submit', function(e) {
            e.preventDefault();
            const payload = {
                aba: "Cadastrar Products",
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
                    Number(document.getElementById('compra-qtd').value),
                    Number(document.getElementById('compra-valor').value),
                    document.getElementById('compra-fornecedor').value.trim()
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
                    Number(document.getElementById('venda-qtd').value),
                    Number(document.getElementById('venda-valor').value)
                ]
            };
            enviarParaSheets(payload, 'form-venda');
        });

        // Evento do formulário de Fiados
        document.getElementById('form-fiado').addEventListener('submit', function(e) {
            e.preventDefault();
            const payload = {
                aba: "Fiados",
                dados: [
                    document.getElementById('fiado-data-compra').value,
                    document.getElementById('fiado-cliente').value.trim(),
                    document.getElementById('fiado-select').value,
                    Number(document.getElementById('fiado-qtd').value),
                    Number(document.getElementById('fiado-valor').value),
                    document.getElementById('fiado-previsao').value,
                    "Pendente" // Status inicial padrão na planilha
                ]
            };
            enviarParaSheets(payload, 'form-fiado');
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
                    const inputData = document.getElementById(formId).querySelector('input[type="date"]');
                    if(inputData) inputData.value = new Date().toISOString().split('T')[0];
                    if(formId === 'form-fiado') carregarTabelaFiados();
                } else {
                    alert('Erro retornado: ' + res.mensagem);
                }
            })
            .catch(err => {
                console.error(err);
                alert('Falha na comunicação com o Google Sheets.');
            });
        }