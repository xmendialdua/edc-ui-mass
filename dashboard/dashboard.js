        const API_BASE = 'http://localhost:5000/api';
        let currentNegotiationId = null;
        let currentContractAgreementId = null;

        // Toggle phase accordion
        function togglePhase(phaseNum) {
            // Manejar tanto números como strings (ej: 'architecture')
            const phaseId = typeof phaseNum === 'number' ? `phase${phaseNum}` : phaseNum;
            const phase = document.getElementById(phaseId);
            if (phase) {
                phase.classList.toggle('active');
            }
        }

        // Add log to container
        function addLog(phaseNum, message) {
            const logsContainer = document.getElementById(`logs-phase${phaseNum}`);
            const logLine = document.createElement('div');
            logLine.className = 'log-line';
            logLine.textContent = message;
            logsContainer.appendChild(logLine);
            logsContainer.scrollTop = logsContainer.scrollHeight;
        }

        // Clear logs
        function clearLogs(phaseNum) {
            const logsContainer = document.getElementById(`logs-phase${phaseNum}`);
            logsContainer.innerHTML = '';
        }

        // Update phase status
        function updateStatus(phaseNum, status) {
            const statusBadge = document.getElementById(`status-phase${phaseNum}`);
            if (status === 'complete') {
                statusBadge.textContent = 'Completado';
                statusBadge.className = 'status-badge status-complete';
            } else if (status === 'pending') {
                statusBadge.textContent = 'Pendiente';
                statusBadge.className = 'status-badge status-pending';
            }
        }

        // Generic API call
        async function callAPI(endpoint, method = 'POST', body = null) {
            try {
                const options = {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                    }
                };
                
                if (body) {
                    options.body = JSON.stringify(body);
                }

                const response = await fetch(`${API_BASE}${endpoint}`, options);
                return await response.json();
            } catch (error) {
                return { success: false, logs: [`Error: ${error.message}`] };
            }
        }

        // Disable button temporarily
        function disableButton(button, duration = 2000) {
            button.disabled = true;
            setTimeout(() => {
                button.disabled = false;
            }, duration);
        }

        // FASE 1 Functions
        async function checkConnectivity() {
            clearLogs(1);
            addLog(1, '🔌 Verificando conectividad a Management APIs...');
            
            const result = await callAPI('/phase1/check-connectivity');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(1, log));
            }
            
            if (result.success) {
                addLog(1, '\n✅ Verificación de conectividad completada');
            }
        }

        async function checkPods() {
            clearLogs(1);
            addLog(1, '📦 Verificando estado de pods en Kubernetes...');
            
            const result = await callAPI('/phase1/check-pods');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(1, log));
            }
            
            if (result.success) {
                addLog(1, '\n✅ Verificación de pods completada');
            }
        }

        async function checkTrust() {
            clearLogs(1);
            addLog(1, '🤝 Verificando relación de trust entre partners...');
            
            const result = await callAPI('/phase1/check-trust');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(1, log));
            }
            
            addLog(1, '\n✅ Verificación de trust completada');
        }

        async function seedPartners() {
            if (!confirm('¿Ejecutar script de seeding de business partners? Esto puede tardar varios minutos.')) {
                return;
            }
            
            clearLogs(1);
            addLog(1, '🌱 Ejecutando seed-business-partners.sh...');
            addLog(1, '⏳ Por favor espera, esto puede tardar varios minutos...');
            
            const result = await callAPI('/phase1/seed-partners');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(1, log));
            }
            
            if (result.success) {
                addLog(1, '\n✅ Seeding completado exitosamente');
                updateStatus(1, 'complete');
            }
        }

        // FASE 2 Functions
        async function createAsset() {
            clearLogs(2);
            
            // Pedir nombre del asset
            let assetName = prompt('Introduce el nombre del asset (letras, números, guiones):');
            
            // Validar que se introdujo un nombre
            if (!assetName) {
                addLog(2, '❌ Operación cancelada');
                return;
            }
            
            // Limpiar y validar el nombre
            assetName = assetName.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-');
            
            if (assetName.length === 0) {
                alert('❌ Error: El nombre del asset no puede estar vacío');
                return;
            }
            
            addLog(2, `🔍 Verificando si el asset '${assetName}' ya existe...`);
            
            // Verificar si el asset ya existe
            const listResult = await callAPI('/phase2/list-assets');
            
            if (listResult.success) {
                // Buscar en los logs si el asset existe
                const logsText = listResult.logs.join('\n');
                
                // Parsear la respuesta para buscar el asset
                try {
                    // Buscar línea con "Encontrados X assets"
                    const foundMatch = logsText.match(/Encontrados (\d+) assets/);
                    
                    if (foundMatch && parseInt(foundMatch[1]) > 0) {
                        // Hay assets, verificar si existe el nuestro
                        if (logsText.includes(`"@id": "${assetName}"`) || logsText.includes(`- ${assetName}`)) {
                            addLog(2, `❌ Error: Ya existe un asset con el nombre '${assetName}'`);
                            addLog(2, '💡 Por favor, elige otro nombre o elimina el asset existente primero');
                            alert(`❌ Error: Ya existe un asset con el nombre '${assetName}'.\n\nPor favor, elige otro nombre.`);
                            return;
                        }
                    }
                } catch (e) {
                    console.error('Error parsing assets:', e);
                }
                
                addLog(2, `✅ El nombre '${assetName}' está disponible`);
                addLog(2, '');
            }
            
            // Crear el asset
            addLog(2, `📦 Creando asset '${assetName}' en MASS...`);
            
            const result = await callAPI('/phase2/create-asset', 'POST', { assetId: assetName });
            
            if (result.logs) {
                result.logs.forEach(log => addLog(2, log));
            }
            
            if (result.success) {
                addLog(2, '\n✅ Asset creado exitosamente');
                updateStatus(2, 'complete');
            }
        }

        async function listAssets() {
            clearLogs(2);
            addLog(2, '📋 Listando assets en MASS...');
            
            const result = await callAPI('/phase2/list-assets');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(2, log));
            }
        }

        // FASE 3 Functions
        async function createAccessPolicy() {
            clearLogs(3);
            addLog(3, '🔐 Creando Access Policy...');
            
            const result = await callAPI('/phase3/create-access-policy');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(3, log));
            }
            
            if (result.success) {
                addLog(3, '\n✅ Access Policy creada exitosamente');
            }
        }

        async function createContractPolicy() {
            clearLogs(3);
            addLog(3, '📜 Creando Contract Policy...');
            
            const result = await callAPI('/phase3/create-contract-policy');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(3, log));
            }
            
            if (result.success) {
                addLog(3, '\n✅ Contract Policy creada exitosamente');
                updateStatus(3, 'complete');
            }
        }

        async function listPolicies() {
            clearLogs(3);
            addLog(3, '📋 Listando políticas en MASS...');
            
            const result = await callAPI('/phase3/list-policies');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(3, log));
            }
            
            if (result.success && result.policies && result.policies.length > 0) {
                // Mostrar el contenedor de políticas
                const policiesViewer = document.getElementById('policies-viewer');
                policiesViewer.style.display = 'block';
                
                // Limpiar contenido previo
                const policiesButtons = document.getElementById('policies-buttons');
                policiesButtons.innerHTML = '';
                
                // Crear botón para cada política
                result.policies.forEach((policy, index) => {
                    const policyId = policy['@id'] || `policy-${index}`;
                    const policyType = policy['@type'] || 'PolicyDefinition';
                    
                    const btn = document.createElement('button');
                    btn.className = 'policy-btn';
                    btn.innerHTML = `
                        <div class="policy-btn-content">
                            <div class="policy-btn-title">${policyType}</div>
                            <div class="policy-btn-id">${policyId}</div>
                        </div>
                        <button class="policy-btn-delete" onclick="event.stopPropagation(); deletePolicy('${policyId}');" title="Eliminar política">
                            🗑️
                        </button>
                    `;
                    
                    btn.onclick = () => showPolicyDetail(policy, btn);
                    
                    policiesButtons.appendChild(btn);
                });
                
                addLog(3, `\n✅ ${result.policies.length} políticas cargadas. Selecciona una para ver su detalle.`);
            } else if (result.success && result.policies) {
                addLog(3, '\nℹ️  No hay políticas registradas en MASS');
                document.getElementById('policies-viewer').style.display = 'none';
            }
        }

        function showPolicyDetail(policy, button) {
            // Remover clase active de todos los botones
            document.querySelectorAll('.policy-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Marcar el botón actual como activo
            button.classList.add('active');
            
            // Mostrar el detalle de la política
            const detailContent = document.getElementById('policy-detail-content');
            detailContent.innerHTML = '';
            
            const policyJson = JSON.stringify(policy, null, 2);
            const pre = document.createElement('pre');
            pre.style.margin = '0';
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.wordWrap = 'break-word';
            pre.textContent = policyJson;
            
            detailContent.appendChild(pre);
        }

        async function deletePolicy(policyId) {
            // Solicitar confirmación
            const confirmed = confirm(`¿Estás seguro de que deseas eliminar la política "${policyId}"?\\n\\nEsta acción no se puede deshacer.`);
            
            if (!confirmed) {
                return;
            }
            
            addLog(3, `🗑️ Eliminando política "${policyId}"...`);
            
            const result = await callAPI('/phase3/delete-policy', 'POST', { policyId });
            
            if (result.logs) {
                result.logs.forEach(log => addLog(3, log));
            }
            
            if (result.success) {
                addLog(3, `\\n✅ Política "${policyId}" eliminada exitosamente`);
                // Recargar la lista de políticas
                setTimeout(() => listPolicies(), 1000);
            }
        }

        // FASE 4 Functions
        async function createContractDefinition() {
            clearLogs(4);
            addLog(4, '🔗 Creando Contract Definition...');
            
            const result = await callAPI('/phase4/create-contract-definition');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(4, log));
            }
            
            if (result.success) {
                addLog(4, '\n✅ Contract Definition creada exitosamente');
                updateStatus(4, 'complete');
            }
        }

        async function listContractDefinitions() {
            clearLogs(4);
            addLog(4, '📋 Listando Contract Definitions en MASS...');
            
            const result = await callAPI('/phase4/list-contract-definitions');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(4, log));
            }
            
            if (result.success && result.contracts && result.contracts.length > 0) {
                // Mostrar el contenedor de Contract Definitions
                const contractsViewer = document.getElementById('contracts-viewer');
                contractsViewer.style.display = 'block';
                
                // Limpiar contenido previo
                const contractsButtons = document.getElementById('contracts-buttons');
                contractsButtons.innerHTML = '';
                
                // Crear botón para cada Contract Definition
                result.contracts.forEach((contract, index) => {
                    const contractId = contract['@id'] || `contract-${index}`;
                    const contractType = contract['@type'] || 'ContractDefinition';
                    
                    const btn = document.createElement('button');
                    btn.className = 'policy-btn';
                    btn.innerHTML = `
                        <div class="policy-btn-content">
                            <div class="policy-btn-title">${contractType}</div>
                            <div class="policy-btn-id">${contractId}</div>
                        </div>
                    `;
                    
                    btn.onclick = () => showContractDetail(contract, btn);
                    
                    contractsButtons.appendChild(btn);
                });
                
                addLog(4, `\\n✅ ${result.contracts.length} Contract Definitions cargados. Selecciona uno para ver su detalle.`);
            } else if (result.success && result.contracts) {
                addLog(4, '\\nℹ️  No hay Contract Definitions registrados en MASS');
                document.getElementById('contracts-viewer').style.display = 'none';
            }
        }

        function showContractDetail(contract, button) {
            // Remover clase active de todos los botones
            document.querySelectorAll('#contracts-buttons .policy-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Marcar el botón actual como activo
            button.classList.add('active');
            
            // Mostrar el detalle del Contract Definition
            const detailContent = document.getElementById('contract-detail-content');
            detailContent.innerHTML = '';
            
            const contractJson = JSON.stringify(contract, null, 2);
            const pre = document.createElement('pre');
            pre.style.margin = '0';
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.wordWrap = 'break-word';
            pre.textContent = contractJson;
            
            detailContent.appendChild(pre);
        }

        // FASE 5 Functions
        async function catalogRequest() {
            clearLogs(5);
            addLog(5, '🔍 Consultando catálogo de MASS desde IKLN...');
            addLog(5, '⏳ Esto puede tardar unos segundos...');
            
            const result = await callAPI('/phase5/catalog-request');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(5, log));
            }
            
            if (result.success) {
                addLog(5, '\n✅ Catalog Request completado');
                updateStatus(5, 'complete');
            }
        }

        // FASE 6 Functions
        async function negotiateContract() {
            clearLogs(6);
            addLog(6, '🤝 Iniciando negociación de contrato...');
            addLog(6, '⏳ Esto puede tardar varios segundos...');
            
            const result = await callAPI('/phase6/negotiate-contract');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(6, log));
            }
            
            if (result.success && result.negotiationId) {
                currentNegotiationId = result.negotiationId;
                addLog(6, '\n✅ Negociación iniciada exitosamente');
                addLog(6, '💡 Usa el botón "Verificar Estado" para monitorear el progreso');
                
                document.getElementById('btn-check-negotiation').style.display = 'inline-flex';
            }
        }

        async function checkNegotiation() {
            if (!currentNegotiationId) {
                addLog(6, '❌ No hay negociación activa');
                return;
            }
            
            addLog(6, '\n🔍 Verificando estado de negociación...');
            
            const result = await callAPI(`/phase6/check-negotiation/${currentNegotiationId}`, 'GET');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(6, log));
            }
            
            if (result.state === 'FINALIZED' && result.contractAgreementId) {
                currentContractAgreementId = result.contractAgreementId;
                addLog(6, '\n✅ Negociación finalizada. Puedes iniciar la transferencia.');
                document.getElementById('btn-initiate-transfer').style.display = 'inline-flex';
                updateStatus(6, 'complete');
            }
        }

        async function initiateTransfer() {
            if (!currentContractAgreementId) {
                addLog(6, '❌ No hay Contract Agreement disponible');
                return;
            }
            
            addLog(6, '\n📥 Iniciando transferencia de datos...');
            
            const result = await callAPI('/phase6/initiate-transfer', 'POST', {
                contractAgreementId: currentContractAgreementId
            });
            
            if (result.logs) {
                result.logs.forEach(log => addLog(6, log));
            }
            
            if (result.success) {
                addLog(6, '\n✅ Transferencia iniciada exitosamente');
                addLog(6, '🎉 ¡Proceso completo! El asset está siendo transferido.');
            }
        }

        // Open phase 1 by default
        window.onload = function() {
            togglePhase(1);
        };
