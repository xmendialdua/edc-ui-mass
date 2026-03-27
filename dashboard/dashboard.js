        const API_BASE = 'http://localhost:5000/api';
        let currentNegotiationId = null;
        let currentContractAgreementId = null;
        let availableBpns = [];

        // Cargar configuración y BPNs al inicio
        async function loadConfig() {
            try {
                const response = await fetch('config.json');
                const config = await response.json();
                availableBpns = config.dataspace_partners || [];
                
                if (availableBpns.length === 0) {
                    console.warn('No se encontraron partners en config.json');
                    addLog(1, '⚠️ Advertencia: No hay partners configurados en config.json');
                }
                
                populateBpnSelect();
            } catch (error) {
                console.error('Error loading config:', error);
                addLog(1, '❌ Error cargando configuración: ' + error.message);
                availableBpns = [];
                populateBpnSelect();
            }
        }

        // Poblar el select de BPNs en el modal
        function populateBpnSelect() {
            const select = document.getElementById('bpn-select');
            select.innerHTML = '';
            
            availableBpns.forEach((bpnInfo, index) => {
                const option = document.createElement('option');
                option.value = bpnInfo.bpn;
                option.className = 'bpn-option';
                option.innerHTML = `${bpnInfo.bpn} - ${bpnInfo.name}`;
                
                // Seleccionar por defecto el que termina en 2IKLN
                if (bpnInfo.bpn.endsWith('2IKLN')) {
                    option.selected = true;
                }
                
                select.appendChild(option);
            });
        }

        // Cargar config al cargar la página
        document.addEventListener('DOMContentLoaded', () => {
            loadConfig();
            initializeNegotiationsFilters();
            initializeTransfersFilters();
        });

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

        async function checkDIDConfiguration() {
            clearLogs(1);
            addLog(1, '🆔 Verificando configuración DID de los conectores...');
            addLog(1, '⏳ Esto puede tardar unos segundos...');
            
            const result = await callAPI('/phase1/check-did-configuration');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(1, log));
            }
            
            addLog(1, '\n✅ Verificación de configuración DID completada');
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
            
            if (result.success && result.assets && result.assets.length > 0) {
                // Mostrar el contenedor de assets
                const assetsViewer = document.getElementById('assets-viewer');
                assetsViewer.style.display = 'block';
                
                // Limpiar contenido previo
                const assetsButtons = document.getElementById('assets-buttons');
                assetsButtons.innerHTML = '';
                
                // Crear botón para cada asset
                result.assets.forEach((asset, index) => {
                    const assetId = asset['@id'] || `asset-${index}`;
                    const assetType = asset['@type'] || 'Asset';
                    
                    const btn = document.createElement('button');
                    btn.className = 'policy-btn';
                    btn.innerHTML = `
                        <div class="policy-btn-content">
                            <div class="policy-btn-title">${assetType}</div>
                            <div class="policy-btn-id">${assetId}</div>
                        </div>
                        <div class="policy-btn-delete" onclick="event.stopPropagation(); deleteAsset('${assetId}');" title="Eliminar asset">
                            🗑️
                        </div>
                    `;
                    
                    btn.onclick = () => showAssetDetail(asset, btn);
                    
                    assetsButtons.appendChild(btn);
                });
                
                addLog(2, `\n✅ ${result.assets.length} assets cargados. Selecciona uno para ver su detalle.`);
            } else if (result.success && result.assets) {
                addLog(2, '\nℹ️  No hay assets registrados en MASS');
                document.getElementById('assets-viewer').style.display = 'none';
            }
        }
        
        function showAssetDetail(asset, button) {
            // Remover clase active de todos los botones
            document.querySelectorAll('#assets-buttons .policy-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Marcar el botón actual como activo
            button.classList.add('active');
            
            // Mostrar el detalle del asset
            const detailContent = document.getElementById('asset-detail-content');
            detailContent.innerHTML = '';
            
            const assetJson = JSON.stringify(asset, null, 2);
            const pre = document.createElement('pre');
            pre.style.margin = '0';
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.wordWrap = 'break-word';
            pre.textContent = assetJson;
            
            detailContent.appendChild(pre);
        }
        
        async function deleteAsset(assetId) {
            // Solicitar confirmación
            const confirmed = confirm(`¿Estás seguro de que deseas eliminar el asset "${assetId}"?\n\nEsta acción no se puede deshacer.`);
            
            if (!confirmed) {
                return;
            }
            
            addLog(2, `🗑️ Eliminando asset "${assetId}"...`);
            
            const result = await callAPI('/phase2/delete-asset', 'POST', { assetId });
            
            if (result.logs) {
                result.logs.forEach(log => addLog(2, log));
            }
            
            if (result.success) {
                addLog(2, `\n✅ Asset "${assetId}" eliminado exitosamente`);
                // Recargar la lista de assets
                setTimeout(() => listAssets(), 1000);
            }
        }

        // FASE 3 Functions
        function openBpnModal() {
            const modal = document.getElementById('bpn-modal');
            modal.classList.add('active');
        }

        function closeBpnModal() {
            const modal = document.getElementById('bpn-modal');
            modal.classList.remove('active');
        }

        async function createAccessPolicy() {
            // Abrir modal para seleccionar BPN
            openBpnModal();
        }

        async function confirmCreateAccessPolicy() {
            const selectedBpn = document.getElementById('bpn-select').value;
            
            if (!selectedBpn) {
                alert('Por favor selecciona un BPN');
                return;
            }
            
            // Cerrar modal
            closeBpnModal();
            
            // Crear policy con el BPN seleccionado
            clearLogs(3);
            addLog(3, `🔐 Creando Access Policy para BPN: ${selectedBpn}...`);
            
            const result = await callAPI('/phase3/create-access-policy', 'POST', { bpn: selectedBpn });
            
            if (result.logs) {
                result.logs.forEach(log => addLog(3, log));
            }
            
            if (result.success) {
                addLog(3, '\n✅ Access Policy creada exitosamente');
            } else if (result.error === 'POLICY_EXISTS') {
                addLog(3, '\n⚠️ ERROR: La Access Policy ya existe');
                addLog(3, '💡 Elimina la política existente antes de crear una nueva o usa otro nombre');
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
            } else if (result.error === 'POLICY_EXISTS') {
                addLog(3, '\n⚠️ ERROR: La Contract Policy ya existe');
                addLog(3, '💡 Elimina la política existente antes de crear una nueva o usa otro nombre');
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
                    let policyType = policy['@type'] || 'PolicyDefinition';
                    
                    // Diferenciar entre Access Policy y Contract Policy
                    const policyJSON = JSON.stringify(policy).toLowerCase();
                    if (policyId.includes('access') || policyJSON.includes('"action":"access"') || policyJSON.includes('"action": "access"')) {
                        policyType = 'Access Policy Definition';
                    } else if (policyId.includes('contract') || policyJSON.includes('"action":"use"') || policyJSON.includes('"action": "use"')) {
                        policyType = 'Contract Policy Definition';
                    }
                    
                    const btn = document.createElement('button');
                    btn.className = 'policy-btn';
                    btn.innerHTML = `
                        <div class="policy-btn-content">
                            <div class="policy-btn-title">${policyType}</div>
                            <div class="policy-btn-id">${policyId}</div>
                        </div>
                        <div class="policy-btn-delete" onclick="event.stopPropagation(); deletePolicy('${policyId}');" title="Eliminar política">
                            🗑️
                        </div>
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
        async function openContractModal() {
            const modal = document.getElementById('contract-modal');
            modal.classList.add('active');
            
            // Cargar assets
            await loadAssetsForContract();
            
            // Cargar políticas
            await loadPoliciesForContract();
        }

        function closeContractModal() {
            const modal = document.getElementById('contract-modal');
            modal.classList.remove('active');
        }

        async function loadAssetsForContract() {
            const select = document.getElementById('contract-asset-select');
            select.innerHTML = '<option value="">Cargando...</option>';
            
            const result = await callAPI('/phase2/list-assets');
            
            if (result.success && result.assets && result.assets.length > 0) {
                select.innerHTML = '';
                result.assets.forEach((asset, index) => {
                    const assetId = asset['@id'] || `asset-${index}`;
                    const option = document.createElement('option');
                    option.value = assetId;
                    option.textContent = assetId;
                    
                    // Seleccionar por defecto si contiene "dummy" o "pdf"
                    if (assetId.toLowerCase().includes('dummy') || assetId.toLowerCase().includes('pdf')) {
                        option.selected = true;
                    }
                    
                    select.appendChild(option);
                });
            } else {
                select.innerHTML = '<option value="">No hay assets disponibles</option>';
            }
        }

        async function loadPoliciesForContract() {
            const accessSelect = document.getElementById('contract-access-policy-select');
            const contractSelect = document.getElementById('contract-contract-policy-select');
            
            accessSelect.innerHTML = '<option value="">Cargando...</option>';
            contractSelect.innerHTML = '<option value="">Cargando...</option>';
            
            const result = await callAPI('/phase3/list-policies');
            
            if (result.success && result.policies && result.policies.length > 0) {
                accessSelect.innerHTML = '';
                contractSelect.innerHTML = '';
                
                result.policies.forEach((policy, index) => {
                    const policyId = policy['@id'] || `policy-${index}`;
                    const policyJSON = JSON.stringify(policy).toLowerCase();
                    
                    // Determinar si es Access o Contract Policy
                    const isAccessPolicy = policyId.includes('access') || policyJSON.includes('"action":"access"') || policyJSON.includes('"action": "access"');
                    const isContractPolicy = policyId.includes('contract') || policyJSON.includes('"action":"use"') || policyJSON.includes('"action": "use"');
                    
                    if (isAccessPolicy) {
                        const option = document.createElement('option');
                        option.value = policyId;
                        option.textContent = policyId;
                        
                        // Seleccionar por defecto si contiene "ikln" o "ikerlan"
                        if (policyId.toLowerCase().includes('ikln') || policyId.toLowerCase().includes('ikerlan')) {
                            option.selected = true;
                        }
                        
                        accessSelect.appendChild(option);
                    }
                    
                    if (isContractPolicy) {
                        const option = document.createElement('option');
                        option.value = policyId;
                        option.textContent = policyId;
                        
                        // Seleccionar por defecto si contiene "ikln" o "ikerlan"
                        if (policyId.toLowerCase().includes('ikln') || policyId.toLowerCase().includes('ikerlan')) {
                            option.selected = true;
                        }
                        
                        contractSelect.appendChild(option);
                    }
                });
                
                if (accessSelect.children.length === 0) {
                    accessSelect.innerHTML = '<option value="">No hay Access Policies disponibles</option>';
                }
                if (contractSelect.children.length === 0) {
                    contractSelect.innerHTML = '<option value="">No hay Contract Policies disponibles</option>';
                }
            } else {
                accessSelect.innerHTML = '<option value="">No hay políticas disponibles</option>';
                contractSelect.innerHTML = '<option value="">No hay políticas disponibles</option>';
            }
        }

        async function createContractDefinition() {
            // Abrir modal para configurar el Contract Definition
            await openContractModal();
        }

        async function confirmCreateContractDefinition() {
            const contractName = document.getElementById('contract-name').value.trim();
            const assetId = document.getElementById('contract-asset-select').value;
            const accessPolicyId = document.getElementById('contract-access-policy-select').value;
            const contractPolicyId = document.getElementById('contract-contract-policy-select').value;
            
            // Validaciones
            if (!contractName) {
                alert('Por favor introduce un nombre para el contrato');
                return;
            }
            if (!assetId) {
                alert('Por favor selecciona un asset');
                return;
            }
            if (!accessPolicyId) {
                alert('Por favor selecciona una Access Policy');
                return;
            }
            if (!contractPolicyId) {
                alert('Por favor selecciona una Contract Policy');
                return;
            }
            
            // Cerrar modal
            closeContractModal();
            
            // Crear Contract Definition
            clearLogs(4);
            addLog(4, `🔗 Creando Contract Definition "${contractName}"...`);
            addLog(4, `   Asset: ${assetId}`);
            addLog(4, `   Access Policy: ${accessPolicyId}`);
            addLog(4, `   Contract Policy: ${contractPolicyId}`);
            addLog(4, '');
            
            const result = await callAPI('/phase4/create-contract-definition', 'POST', {
                contractName: contractName,
                assetId: assetId,
                accessPolicyId: accessPolicyId,
                contractPolicyId: contractPolicyId
            });
            
            if (result.logs) {
                result.logs.forEach(log => addLog(4, log));
            }
            
            if (result.success) {
                addLog(4, '\n✅ Contract Definition creado exitosamente');
                updateStatus(4, 'complete');
            } else if (result.error === 'CONTRACT_EXISTS') {
                addLog(4, '\n⚠️ ERROR: El Contract Definition ya existe');
                addLog(4, '💡 Usa otro nombre o elimina el contrato existente');
            } else {
                addLog(4, '\n❌ Error al crear el Contract Definition');
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
                        <div class="policy-btn-delete" onclick="event.stopPropagation(); deleteContractDefinition('${contractId}');" title="Eliminar Contract Definition">
                            🗑️
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

        async function deleteContractDefinition(contractId) {
            if (!confirm(`¿Estás seguro de que quieres eliminar el Contract Definition "${contractId}"?\n\nEsto no eliminará el asset ni las políticas vinculadas, solo el vínculo entre ellos.`)) {
                return;
            }
            
            clearLogs(4);
            addLog(4, `🗑️ Eliminando Contract Definition "${contractId}"...`);
            
            const result = await callAPI('/phase4/delete-contract-definition', 'POST', {
                contractId: contractId
            });
            
            if (result.logs) {
                result.logs.forEach(log => addLog(4, log));
            }
            
            if (result.success) {
                addLog(4, `\\n✅ Contract Definition "${contractId}" eliminado exitosamente`);
                // Recargar la lista de Contract Definitions
                setTimeout(() => listContractDefinitions(), 1000);
            }
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
                if (result.datasets && result.datasets.length > 0) {
                    // Mostrar el contenedor de datasets
                    const catalogViewer = document.getElementById('catalog-viewer');
                    catalogViewer.style.display = 'block';
                    
                    // Limpiar contenido previo
                    const catalogButtons = document.getElementById('catalog-buttons');
                    catalogButtons.innerHTML = '';
                    
                    // Crear botón para cada dataset
                    result.datasets.forEach((dataset, index) => {
                        const datasetId = dataset['@id'] || `dataset-${index}`;
                        
                        // Obtener nombre del dataset
                        let datasetName = 'Dataset';
                        const props = dataset.properties || dataset['edc:properties'] || {};
                        if (props.name || props['edc:name']) {
                            datasetName = props.name || props['edc:name'];
                        }
                        
                        const btn = document.createElement('button');
                        btn.className = 'policy-btn';
                        btn.innerHTML = `
                            <div class="policy-btn-content">
                                <div class="policy-btn-title">${datasetName}</div>
                                <div class="policy-btn-id">${datasetId}</div>
                            </div>
                        `;
                        
                        btn.onclick = () => showCatalogDetail(dataset, btn);
                        
                        catalogButtons.appendChild(btn);
                    });
                    
                    addLog(5, `\n✅ ${result.datasets.length} datasets mostrados en el visor`);
                } else {
                    document.getElementById('catalog-viewer').style.display = 'none';
                }
                
                addLog(5, '\n✅ Catalog Request completado');
                updateStatus(5, 'complete');
            }
        }
        
        function showCatalogDetail(dataset, button) {
            // Remover clase active de todos los botones
            document.querySelectorAll('#catalog-buttons .policy-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Marcar el botón actual como activo
            button.classList.add('active');
            
            // Mostrar el detalle del dataset
            const detailContent = document.getElementById('catalog-detail-content');
            detailContent.innerHTML = '';
            
            const datasetJson = JSON.stringify(dataset, null, 2);
            const pre = document.createElement('pre');
            pre.style.margin = '0';
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.wordWrap = 'break-word';
            pre.textContent = datasetJson;
            
            detailContent.appendChild(pre);
        }

        // FASE 6 Functions - Descubrimiento, Negociación y Transferencia
        
        // Estado global para FASE 6
        let phase6CurrentDataset = null;
        let phase6Negotiations = [];
        let phase6Transfers = [];
        
        // Estado de filtros para negotiations
        let negotiationsFilters = {
            timeRange: 'all',      // all, 30min, 2hours, 1day, 2days
            sortBy: 'time',        // time, name
            sortDirection: 'newest' // newest, oldest
        };
        
        // Estado de filtros para transfers
        let transfersFilters = {
            timeRange: 'all',      // all, 30min, 2hours, 1day, 2days
            sortBy: 'time',        // time, name
            sortDirection: 'newest' // newest, oldest
        };
        
        // Función para calcular tiempo relativo
        function getRelativeTime(timestamp) {
            if (!timestamp) return 'Unknown';
            
            const now = new Date();
            const then = new Date(timestamp);
            const diffMs = now - then;
            const diffSecs = Math.floor(diffMs / 1000);
            const diffMins = Math.floor(diffSecs / 60);
            const diffHours = Math.floor(diffMins / 60);
            const diffDays = Math.floor(diffHours / 24);
            
            if (diffSecs < 60) return `${diffSecs} second${diffSecs !== 1 ? 's' : ''} ago`;
            if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
            if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
            return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
        }
        
        // Función para toggle de paneles desplegables
        function togglePanel(panelId) {
            const panel = document.getElementById(panelId);
            if (!panel) return;
            
            const content = panel.querySelector('.panel-content');
            const toggle = panel.querySelector('.panel-toggle');
            
            if (content.classList.contains('open')) {
                content.classList.remove('open');
                toggle.textContent = '▶';
            } else {
                content.classList.add('open');
                toggle.textContent = '▼';
            }
        }
        
        // Consultar catálogo de MASS desde IKLN
        async function phase6CatalogRequest() {
            console.log('🔍 phase6CatalogRequest() called');
            clearLogs(6);
            addLog(6, '🔍 Consultando catálogo de MASS desde IKLN...');
            
            const result = await callAPI('/phase6/catalog-request', 'POST');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(6, log));
            }
            
            if (result.success && result.datasets) {
                // Mostrar el panel padre de Catalogs
                document.getElementById('phase6-catalogs-panel').style.display = 'block';
                
                // Mostrar el contenedor de datasets
                const catalogViewer = document.getElementById('phase6-catalog-viewer');
                catalogViewer.style.display = 'block';
                
                // Limpiar contenido previo
                const catalogButtons = document.getElementById('phase6-catalog-buttons');
                catalogButtons.innerHTML = '';
                
                // Crear botón para cada dataset
                result.datasets.forEach((dataset, index) => {
                    const datasetId = dataset['@id'] || `dataset-${index}`;
                    const datasetName = dataset['dcat:distribution']?.[0]?.['dcat:accessService']?.['dct:title'] || datasetId;
                    
                    const btn = document.createElement('button');
                    btn.className = 'policy-btn';
                    btn.innerHTML = `
                        <div class="policy-btn-content">
                            <div class="policy-btn-title">${datasetName}</div>
                            <div class="policy-btn-id">${datasetId}</div>
                        </div>
                    `;
                    
                    btn.onclick = () => showPhase6CatalogDetail(dataset, btn);
                    
                    catalogButtons.appendChild(btn);
                });
                
                addLog(6, `\n✅ ${result.datasets.length} dataset(s) cargados. Selecciona uno para ver sus assets.`);
                
                // Mostrar panel de assets (inicialmente vacío)
                document.getElementById('phase6-assets-panel').style.display = 'block';
            } else if (result.success && result.datasets) {
                addLog(6, '\nℹ️  No hay datasets en el catálogo de MASS');
                document.getElementById('phase6-catalogs-panel').style.display = 'none';
                document.getElementById('phase6-catalog-viewer').style.display = 'none';
            }
        }
        
        // Mostrar detalle de un dataset y sus assets
        function showPhase6CatalogDetail(dataset, button) {
            // Remover clase active de todos los botones
            document.querySelectorAll('#phase6-catalog-buttons .policy-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Marcar el botón actual como activo
            button.classList.add('active');
            
            // Guardar dataset actual
            phase6CurrentDataset = dataset;
            
            // Mostrar el detalle del dataset
            const detailContent = document.getElementById('phase6-catalog-detail-content');
            detailContent.innerHTML = '';
            
            const datasetJson = JSON.stringify(dataset, null, 2);
            const pre = document.createElement('pre');
            pre.style.margin = '0';
            pre.style.whiteSpace = 'pre-wrap';
            pre.style.wordWrap = 'break-word';
            pre.textContent = datasetJson;
            
            detailContent.appendChild(pre);
            
            // Mostrar assets del dataset
            showPhase6Assets(dataset);
        }
        
        // Mostrar assets de un dataset en el panel "Assets in Catalog"
        function showPhase6Assets(dataset) {
            const assetsList = document.getElementById('phase6-assets-list');
            assetsList.innerHTML = '';
            
            // Obtener las políticas (offers) del dataset
            // Normalizar: puede ser un objeto o un array
            let offersRaw = dataset['odrl:hasPolicy'] || [];
            const offers = Array.isArray(offersRaw) ? offersRaw : [offersRaw];
            
            if (offers.length === 0 || !offers[0]) {
                assetsList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No hay assets en este dataset</p>';
                return;
            }
            
            // Extraer información del dataset
            const datasetName = dataset['name'] || dataset['dct:title'] || dataset['@id'];
            const datasetDescription = dataset['description'] || dataset['dct:description'] || 'PDF de prueba para demostración de políticas EDC basadas en BPN';
            const datasetId = dataset['id'] || dataset['@id'];
            const contentType = dataset['contenttype'] || 'application/pdf';
            
            // Crear una card por cada asset/offer
            offers.forEach((offer, index) => {
                const offerId = offer['@id'] || `offer-${index}`;
                
                // Truncar el Contract ID si es muy largo
                const contractIdDisplay = offerId.length > 60 ? offerId.substring(0, 60) + '...' : offerId;
                
                const card = document.createElement('div');
                card.className = 'asset-card-enhanced';
                card.innerHTML = `
                    <div class="asset-card-content">
                        <div class="asset-icon">📄</div>
                        <div class="asset-info">
                            <h3 class="asset-name">${datasetName}</h3>
                            <p class="asset-description">${datasetDescription}</p>
                            <div class="asset-metadata">
                                <div class="asset-meta-item">
                                    <span class="meta-label">ID:</span>
                                    <span class="meta-value">${datasetId}</span>
                                </div>
                                <div class="asset-meta-item">
                                    <span class="meta-label">Contract ID:</span>
                                    <span class="meta-value" title="${offerId}">${contractIdDisplay}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="asset-card-footer">
                        <button class="btn-negotiate-enhanced" onclick="phase6NegotiateAsset('${datasetId}', '${index}')">
                            Negotiate
                        </button>
                    </div>
                `;
                
                assetsList.appendChild(card);
            });
            
            addLog(6, `\n📦 ${offers.length} asset(s) mostrados en "Assets in Catalog"`);
            
            // Asegurar que el panel de assets esté visible y abierto
            const assetsPanel = document.getElementById('phase6-assets-panel');
            assetsPanel.style.display = 'block';
            const assetsPanelContent = assetsPanel.querySelector('.panel-content');
            if (!assetsPanelContent.classList.contains('open')) {
                assetsPanelContent.classList.add('open');
            }
        }
        
        // Negociar un asset específico
        async function phase6NegotiateAsset(assetId, offerIndex) {
            if (!phase6CurrentDataset) {
                addLog(6, '❌ No hay dataset seleccionado');
                return;
            }
            
            addLog(6, `\n🤝 Iniciando negociación para asset: ${assetId}`);
            
            // Obtener la política del dataset (normalizar: puede ser un objeto o un array)
            let offersRaw = phase6CurrentDataset['odrl:hasPolicy'] || [];
            const offers = Array.isArray(offersRaw) ? offersRaw : [offersRaw];
            const policy = offers[parseInt(offerIndex)];
            
            if (!policy) {
                addLog(6, '❌ No se encontró la política para este asset');
                addLog(6, `Debug: offerIndex=${offerIndex}, offers.length=${offers.length}`);
                console.error('Dataset:', phase6CurrentDataset);
                console.error('Offers:', offers);
                return;
            }
            
            addLog(6, `📄 Política encontrada: ${policy['@id']}`);
            
            const result = await callAPI('/phase6/negotiate-asset', 'POST', {
                assetId: assetId,
                policy: policy
            });
            
            if (result.logs) {
                result.logs.forEach(log => addLog(6, log));
            }
            
            // Agregar la negociación a la lista (exitosa o fallida)
            if (result.negotiation) {
                phase6Negotiations.push(result.negotiation);
                updatePhase6NegotiationsList();
                
                // Mostrar panel de negociaciones
                document.getElementById('phase6-negotiations-panel').style.display = 'block';
                
                if (result.success) {
                    addLog(6, `✅ Negociación agregada a "Negotiated Contracts"`);
                    
                    // Auto-refresh después de 3 segundos
                    setTimeout(() => {
                        phase6RefreshNegotiations();
                    }, 3000);
                } else {
                    addLog(6, `❌ Negociación fallida agregada a "Negotiated Contracts"`);
                }
            }
        }
        
        // Refrescar lista de negociaciones desde el servidor
        async function phase6RefreshNegotiations() {
            const result = await callAPI('/phase6/list-negotiations', 'GET');
            
            if (result.success && result.negotiations) {
                // Combinar con negociaciones locales (en caso de fallos que no están en el servidor)
                const serverNegotiationIds = result.negotiations.map(n => n.id);
                const localFailedNegotiations = phase6Negotiations.filter(
                    n => n.state === 'FAILED' && !serverNegotiationIds.includes(n.id)
                );
                
                phase6Negotiations = [...result.negotiations, ...localFailedNegotiations];
                updatePhase6NegotiationsList();
            }
        }
        
        // Consultar contratos negociados existentes
        async function phase6ConsultarContratos() {
            console.log('📜 phase6ConsultarContratos() called');
            clearLogs(6);
            addLog(6, '📜 Consultando contratos negociados del conector IKLN...');
            addLog(6, '⌛ Por favor espera, recuperando negociaciones del servidor...');
            
            const result = await callAPI('/phase6/list-negotiations', 'GET');
            
            if (result.success && result.negotiations) {
                // Combinar con negociaciones locales (en caso de fallos que no están en el servidor)
                const serverNegotiationIds = result.negotiations.map(n => n.id);
                const localFailedNegotiations = phase6Negotiations.filter(
                    n => n.state === 'FAILED' && !serverNegotiationIds.includes(n.id)
                );
                
                phase6Negotiations = [...result.negotiations, ...localFailedNegotiations];
                updatePhase6NegotiationsList();
                
                // Mostrar el panel de negociaciones
                document.getElementById('phase6-negotiations-panel').style.display = 'block';
                
                // Logs informativos
                addLog(6, '');
                addLog(6, `✅ Recuperadas ${result.negotiations.length} negociaciones del servidor`);
                
                // Contar por estado
                const stateCount = {};
                result.negotiations.forEach(n => {
                    stateCount[n.state] = (stateCount[n.state] || 0) + 1;
                });
                
                addLog(6, '');
                addLog(6, '📊 Resumen por estado:');
                Object.keys(stateCount).forEach(state => {
                    const emoji = state === 'FINALIZED' || state === 'TERMINATED' ? '✅' : 
                                 state === 'FAILED' ? '❌' : '🔄';
                    addLog(6, `   ${emoji} ${state}: ${stateCount[state]}`);
                });
                
                // Contar exitosas con contrato
                const withContract = result.negotiations.filter(n => 
                    (n.state === 'FINALIZED' || n.state === 'TERMINATED') && n.contractAgreementId
                ).length;
                
                if (withContract > 0) {
                    addLog(6, '');
                    addLog(6, `🎉 ${withContract} negociación(es) exitosa(s) con Contract Agreement ID`);
                    addLog(6, '   Estas negociaciones pueden usarse para iniciar transferencias');
                }
                
                addLog(6, '');
                addLog(6, 'ℹ️  Usa los filtros para ordenar y filtrar las negociaciones');
                addLog(6, 'ℹ️  Haz clic en el icono 🔽 para abrir el menú de filtros');
                
            } else {
                addLog(6, '');
                addLog(6, '⚠️  No se pudieron recuperar las negociaciones');
                if (result.error) {
                    addLog(6, `   Error: ${result.error}`);
                }
            }
        }
        
        // Actualizar lista visual de negociaciones
        function updatePhase6NegotiationsList() {
            const negotiationsList = document.getElementById('phase6-negotiations-list');
            
            // Aplicar filtro
            const showFailed = document.getElementById('phase6-show-failed-negotiations')?.checked || false;
            let filteredNegotiations = phase6Negotiations.filter(n => {
                if (!showFailed && n.state === 'FAILED') return false;
                return true;
            });
            
            // Aplicar filtro de rango temporal
            filteredNegotiations = filterByTimeRange(filteredNegotiations, negotiationsFilters.timeRange);
            
            // Aplicar ordenación
            filteredNegotiations = sortNegotiations(filteredNegotiations, negotiationsFilters.sortBy, negotiationsFilters.sortDirection);
            
            if (filteredNegotiations.length === 0) {
                negotiationsList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No hay negociaciones</p>';
                return;
            }
            
            negotiationsList.innerHTML = '';
            
            filteredNegotiations.forEach(negotiation => {
                const card = document.createElement('div');
                // FINALIZED y TERMINATED son estados exitosos
                const isSuccess = negotiation.state === 'FINALIZED' || negotiation.state === 'TERMINATED';
                const isFailed = negotiation.state === 'FAILED';
                
                card.className = 'negotiation-card';
                if (isSuccess) card.classList.add('success');
                if (isFailed) card.classList.add('failed');
                
                let statusClass = 'in-progress';
                if (negotiation.state === 'FINALIZED') statusClass = 'finalized';
                if (negotiation.state === 'TERMINATED') statusClass = 'finalized';
                if (isFailed) statusClass = 'failed';
                
                // Calcular tiempo relativo
                const timeAgo = getRelativeTime(negotiation.createdAt);
                
                let actionsHtml = '';
                if (isSuccess && negotiation.contractAgreementId) {
                    actionsHtml = `
                        <button class="btn-transfer" onclick="phase6InitiateTransfer('${negotiation.contractAgreementId}', '${negotiation.assetId}')">
                            📥 Transfer
                        </button>
                    `;
                }
                
                let errorHtml = '';
                if (isFailed && negotiation.errorDetail) {
                    errorHtml = `
                        <div class="negotiation-error">
                            <strong>Error:</strong> ${negotiation.errorDetail.substring(0, 200)}
                        </div>
                    `;
                }
                
                card.innerHTML = `
                    <div class="negotiation-card-header">
                        <div>
                            <h3 style="margin: 0 0 4px 0; font-size: 14px; color: #333;">${negotiation.assetId}</h3>
                            <div style="font-size: 12px; color: #999; margin-bottom: 8px;">${timeAgo}</div>
                            <span class="negotiation-status ${statusClass}">${negotiation.state}</span>
                        </div>
                    </div>
                    <div class="negotiation-details">
                        <div class="negotiation-info-item">
                            <span class="negotiation-info-label">Negotiation ID</span>
                            <span class="negotiation-info-value">${negotiation.id}</span>
                        </div>
                        ${negotiation.contractAgreementId ? `
                        <div class="negotiation-info-item">
                            <span class="negotiation-info-label">Agreement ID</span>
                            <span class="negotiation-info-value">${negotiation.contractAgreementId}</span>
                        </div>
                        ` : ''}
                        ${negotiation.counterPartyAddress ? `
                        <div class="negotiation-info-item">
                            <span class="negotiation-info-label">Counter Party Address</span>
                            <span class="negotiation-info-value">${negotiation.counterPartyAddress}</span>
                        </div>
                        ` : ''}
                        ${negotiation.counterPartyId ? `
                        <div class="negotiation-info-item">
                            <span class="negotiation-info-label">Counter Party ID</span>
                            <span class="negotiation-info-value">${negotiation.counterPartyId}</span>
                        </div>
                        ` : ''}
                    </div>
                    ${errorHtml}
                    ${actionsHtml ? `<div style="margin-top: 12px;">${actionsHtml}</div>` : ''}
                `;
                
                negotiationsList.appendChild(card);
            });
        }
        
        // Toggle del panel de filtros
        function toggleNegotiationsFilter() {
            const dropdown = document.getElementById('negotiations-filter-dropdown');
            dropdown.classList.toggle('show');
        }
        
        // Cerrar dropdown al hacer clic fuera
        document.addEventListener('click', function(event) {
            const dropdown = document.getElementById('negotiations-filter-dropdown');
            const filterIcon = document.querySelector('.filter-toggle-icon');
            
            if (dropdown && !dropdown.contains(event.target) && event.target !== filterIcon) {
                dropdown.classList.remove('show');
            }
        });
        
        // Seleccionar una opción de filtro
        function selectFilter(filterType, value, element) {
            // Actualizar estado del filtro
            if (filterType === 'time-range') {
                negotiationsFilters.timeRange = value;
            } else if (filterType === 'sort-by') {
                negotiationsFilters.sortBy = value;
            } else if (filterType === 'sort-direction') {
                negotiationsFilters.sortDirection = value;
            }
            
            // Actualizar UI - remover active de hermanos
            const siblings = element.parentElement.querySelectorAll('.filter-option');
            siblings.forEach(sib => sib.classList.remove('active'));
            element.classList.add('active');
            
            // Aplicar filtros
            phase6FilterNegotiations();
        }
        
        // Filtrar por rango de tiempo
        function filterByTimeRange(negotiations, range) {
            if (range === 'all') return negotiations;
            
            const now = new Date();
            const ranges = {
                '30min': 30 * 60 * 1000,
                '2hours': 2 * 60 * 60 * 1000,
                '1day': 24 * 60 * 60 * 1000,
                '2days': 2 * 24 * 60 * 60 * 1000
            };
            
            const threshold = now - ranges[range];
            
            return negotiations.filter(n => {
                const createdAt = new Date(n.createdAt);
                return createdAt >= threshold;
            });
        }
        
        // Ordenar negociaciones
        function sortNegotiations(negotiations, sortBy, direction) {
            const sorted = [...negotiations];
            
            if (sortBy === 'time') {
                sorted.sort((a, b) => {
                    const timeA = new Date(a.createdAt).getTime();
                    const timeB = new Date(b.createdAt).getTime();
                    return direction === 'newest' ? timeB - timeA : timeA - timeB;
                });
            } else if (sortBy === 'name') {
                sorted.sort((a, b) => {
                    const nameA = (a.assetId || '').toLowerCase();
                    const nameB = (b.assetId || '').toLowerCase();
                    const comparison = nameA.localeCompare(nameB);
                    return direction === 'newest' ? -comparison : comparison;
                });
            }
            
            return sorted;
        }
        
        // Inicializar filtros con valores por defecto
        function initializeNegotiationsFilters() {
            // Marcar como activos los filtros por defecto
            setTimeout(() => {
                // Time range: All Time
                const timeRangeAll = document.querySelector('[data-filter="time-range"][data-value="all"]');
                if (timeRangeAll) timeRangeAll.classList.add('active');
                
                // Sort by: Time
                const sortByTime = document.querySelector('[data-filter="sort-by"][data-value="time"]');
                if (sortByTime) sortByTime.classList.add('active');
                
                // Sort direction: Newest First
                const sortNewest = document.querySelector('[data-filter="sort-direction"][data-value="newest"]');
                if (sortNewest) sortNewest.classList.add('active');
            }, 100);
        }
        
        // Filtrar negociaciones
        function phase6FilterNegotiations() {
            updatePhase6NegotiationsList();
        }
        
        // === FUNCIONES DE FILTRADO PARA TRANSFERS ===
        
        // Toggle dropdown de filtros para transfers
        function toggleTransfersFilter() {
            const dropdown = document.getElementById('transfers-filter-dropdown');
            if (dropdown) {
                dropdown.classList.toggle('show');
            }
        }
        
        // Seleccionar filtro de transfer
        function selectTransferFilter(filterType, value, element) {
            // Actualizar estado
            if (filterType === 'time-range') {
                transfersFilters.timeRange = value;
            } else if (filterType === 'sort-by') {
                transfersFilters.sortBy = value;
            } else if (filterType === 'sort-direction') {
                transfersFilters.sortDirection = value;
            }
            
            // Actualizar UI (marcar como activo)
            const group = element.closest('.filter-group');
            if (group) {
                group.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('active'));
                element.classList.add('active');
            }
            
            // Aplicar filtros
            updatePhase6TransfersList();
            
            // Cerrar dropdown
            const dropdown = document.getElementById('transfers-filter-dropdown');
            if (dropdown) {
                dropdown.classList.remove('show');
            }
        }
        
        // Filtrar transfers por rango temporal
        function filterTransfersByTimeRange(transfers, range) {
            if (range === 'all') return transfers;
            
            const now = Date.now();
            const ranges = {
                '30min': 30 * 60 * 1000,
                '2hours': 2 * 60 * 60 * 1000,
                '1day': 24 * 60 * 60 * 1000,
                '2days': 2 * 24 * 60 * 60 * 1000
            };
            
            const threshold = now - ranges[range];
            
            return transfers.filter(t => {
                const createdAt = new Date(t.createdAt);
                return createdAt >= threshold;
            });
        }
        
        // Ordenar transfers
        function sortTransfers(transfers, sortBy, direction) {
            const sorted = [...transfers];
            
            if (sortBy === 'time') {
                sorted.sort((a, b) => {
                    const timeA = new Date(a.createdAt).getTime();
                    const timeB = new Date(b.createdAt).getTime();
                    return direction === 'newest' ? timeB - timeA : timeA - timeB;
                });
            } else if (sortBy === 'name') {
                sorted.sort((a, b) => {
                    const nameA = (a.assetId || '').toLowerCase();
                    const nameB = (b.assetId || '').toLowerCase();
                    const comparison = nameA.localeCompare(nameB);
                    return direction === 'newest' ? -comparison : comparison;
                });
            }
            
            return sorted;
        }
        
        // Inicializar filtros de transfers con valores por defecto
        function initializeTransfersFilters() {
            setTimeout(() => {
                // Time range: All Time
                const timeRangeAll = document.querySelector('#transfers-filter-dropdown [data-filter="time-range"][data-value="all"]');
                if (timeRangeAll) timeRangeAll.classList.add('active');
                
                // Sort by: Time
                const sortByTime = document.querySelector('#transfers-filter-dropdown [data-filter="sort-by"][data-value="time"]');
                if (sortByTime) sortByTime.classList.add('active');
                
                // Sort direction: Newest First
                const sortNewest = document.querySelector('#transfers-filter-dropdown [data-filter="sort-direction"][data-value="newest"]');
                if (sortNewest) sortNewest.classList.add('active');
            }, 100);
        }
        
        // Iniciar transferencia para un contrato
        async function phase6InitiateTransfer(contractAgreementId, assetId) {
            addLog(6, `\n📥 Iniciando transferencia para contrato: ${contractAgreementId}`);
            
            const result = await callAPI('/phase6/initiate-transfer-for-contract', 'POST', {
                contractAgreementId: contractAgreementId,
                assetId: assetId
            });
            
            if (result.logs) {
                result.logs.forEach(log => addLog(6, log));
            }
            
            // Agregar la transferencia a la lista
            if (result.transfer) {
                phase6Transfers.push(result.transfer);
                updatePhase6TransfersList();
                
                // Mostrar panel de transferencias
                document.getElementById('phase6-transfers-panel').style.display = 'block';
                
                if (result.success) {
                    addLog(6, `✅ Transferencia agregada a "Initiated Transfers"`);
                    addLog(6, `⏳ Esperando a que el EDC genere el Endpoint Data Reference...`);
                    addLog(6, `   El sistema verificará el estado automáticamente cada 5 segundos`);
                    
                    // Auto-refresh periódico hasta obtener el EDR (máximo 10 intentos = 50 segundos)
                    let refreshAttempts = 0;
                    const maxAttempts = 10;
                    
                    const autoRefreshInterval = setInterval(async () => {
                        refreshAttempts++;
                        await phase6RefreshTransfers();
                        
                        // Verificar si ya tenemos el EDR
                        const latestTransfer = phase6Transfers[0]; // La más reciente
                        if (latestTransfer && latestTransfer.edrAvailable) {
                            clearInterval(autoRefreshInterval);
                            addLog(6, `\n🎉 ¡EDR disponible! Ya puedes descargar el fichero.`);
                        } else if (refreshAttempts >= maxAttempts) {
                            clearInterval(autoRefreshInterval);
                            addLog(6, `\n⏱️ Tiempo de espera agotado. Usa el botón "Refresh Status" para actualizar manualmente.`);
                        }
                    }, 5000); // Cada 5 segundos
                }
            }
        }
        
        // Refrescar lista de transferencias desde el servidor
        async function phase6RefreshTransfers() {
            addLog(6, '\n🔄 Actualizando estado de transferencias...');
            
            const result = await callAPI('/phase6/list-transfers', 'GET');
            
            if (result.success && result.transfers) {
                phase6Transfers = result.transfers;
                
                // Mostrar la transferencia más relevante: priorizar las que tienen EDR disponible
                if (result.transfers.length > 0) {
                    // Primero buscar transferencias con EDR disponible
                    const transfersWithEdr = result.transfers.filter(t => t.edrAvailable);
                    
                    let latestTransfer;
                    if (transfersWithEdr.length > 0) {
                        // Si hay EDRs disponibles, mostrar el más reciente con EDR
                        const sortedWithEdr = [...transfersWithEdr].sort((a, b) => {
                            const timeA = new Date(a.createdAt).getTime();
                            const timeB = new Date(b.createdAt).getTime();
                            return timeB - timeA;
                        });
                        latestTransfer = sortedWithEdr[0];
                    } else {
                        // Si no hay EDRs, mostrar la transferencia más reciente
                        const sortedTransfers = [...result.transfers].sort((a, b) => {
                            const timeA = new Date(a.createdAt).getTime();
                            const timeB = new Date(b.createdAt).getTime();
                            return timeB - timeA;
                        });
                        latestTransfer = sortedTransfers[0];
                    }
                    
                    const stateEmoji = latestTransfer.state === 'COMPLETED' ? '✅' : 
                                     latestTransfer.state === 'STARTED' ? '🟢' : 
                                     latestTransfer.state === 'TERMINATED' ? '⚠️' : 
                                     latestTransfer.state === 'FAILED' ? '❌' : '🔄';
                    
                    addLog(6, `${stateEmoji} Transfer más reciente: ${latestTransfer.id.substring(0, 12)}...`);
                    addLog(6, `   Estado: ${latestTransfer.state}`);
                    addLog(6, `   Asset: ${latestTransfer.assetId}`);
                    
                    if (latestTransfer.edrAvailable) {
                        addLog(6, `   ✅ EDR disponible - ¡Puedes descargar el fichero!`);
                        if (latestTransfer.edrEndpoint) {
                            addLog(6, `   📍 Endpoint: ${latestTransfer.edrEndpoint.substring(0, 50)}...`);
                        }
                    } else if (latestTransfer.state === 'TERMINATED' || latestTransfer.state === 'COMPLETED') {
                        addLog(6, `   ⚠️  EDR no disponible aún - Puede tardar unos segundos`);
                    } else if (latestTransfer.state === 'FAILED') {
                        addLog(6, `   ❌ Error: ${(latestTransfer.errorDetail || 'Desconocido').substring(0, 100)}`);
                    } else if (latestTransfer.state === 'REQUESTED' || latestTransfer.state === 'REQUESTING') {
                        addLog(6, `   ⏳ Procesando transferencia... (EDRs disponibles solo en estados STARTED/COMPLETED/TERMINATED)`);
                    } else if (latestTransfer.state === 'STARTED') {
                        addLog(6, `   🟢 Transferencia en progreso - Generando EDR...`);
                    }
                    
                    // Resumen de todas las transferencias
                    const totalTransfers = result.transfers.length;
                    const withEdr = result.transfers.filter(t => t.edrAvailable).length;
                    addLog(6, `\n📊 Total: ${totalTransfers} transferencias (${withEdr} con EDR disponible)`);
                }
                
                updatePhase6TransfersList();
                addLog(6, '✅ Estado actualizado');
            } else {
                addLog(6, '❌ Error al actualizar transferencias');
            }
        }
        
        // Actualizar lista visual de transferencias
        function updatePhase6TransfersList() {
            const transfersList = document.getElementById('phase6-transfers-list');
            
            if (phase6Transfers.length === 0) {
                transfersList.innerHTML = '<p style="color: #999; text-align: center; padding: 20px;">No hay transferencias todavía</p>';
                return;
            }
            
            // PRIORIZAR: Mostrar transferencia con EDR disponible, si existe
            let filteredTransfers = [...phase6Transfers];
            
            // Primero buscar transferencias con EDR
            const transfersWithEdr = filteredTransfers.filter(t => t.edrAvailable);
            
            if (transfersWithEdr.length > 0) {
                // Si hay EDR disponible, mostrar la transferencia con EDR más reciente
                transfersWithEdr.sort((a, b) => {
                    const timeA = new Date(a.createdAt).getTime();
                    const timeB = new Date(b.createdAt).getTime();
                    return timeB - timeA;
                });
                filteredTransfers = [transfersWithEdr[0]];
            } else {
                // Si no hay EDR, mostrar la más reciente
                filteredTransfers.sort((a, b) => {
                    const timeA = new Date(a.createdAt).getTime();
                    const timeB = new Date(b.createdAt).getTime();
                    return timeB - timeA;
                });
                filteredTransfers = [filteredTransfers[0]];
            }
            
            transfersList.innerHTML = '';
            
            filteredTransfers.forEach(transfer => {
                const card = document.createElement('div');
                const isCompleted = transfer.state === 'COMPLETED' || transfer.state === 'STARTED';
                const isInProgress = transfer.state === 'REQUESTED' || transfer.state === 'STARTING';
                const isTerminated = transfer.state === 'TERMINATED';
                
                card.className = 'transfer-card';
                if (isCompleted) card.classList.add('completed');
                if (isInProgress) card.classList.add('in-progress');
                if (isTerminated) card.classList.add('terminated');
                
                let statusClass = 'in-progress';
                if (isCompleted) statusClass = 'completed';
                if (isTerminated) statusClass = 'completed';
                if (transfer.state === 'FAILED') statusClass = 'failed';
                
                // Formatear timestamp
                const createdDate = transfer.createdAt ? new Date(transfer.createdAt) : null;
                const timeStr = createdDate ? createdDate.toLocaleString('es-ES') : 'N/A';
                
                // Mensaje de estado según el estado de la transferencia
                let stateMessage = '';
                if (transfer.state === 'REQUESTED' || transfer.state === 'REQUESTING') {
                    stateMessage = '<div style="background: #e3f2fd; padding: 10px; margin-top: 10px; border-radius: 4px; font-size: 12px; color: #1976d2;">' +
                        '⏳ <strong>Negociando transferencia...</strong><br>' +
                        'El conector está procesando la solicitud. Los EDRs solo están disponibles cuando el estado cambia a:<br>' +
                        '• <strong>STARTED</strong>: Transferencia iniciada<br>' +
                        '• <strong>COMPLETED</strong>: Transferencia completada<br>' +
                        '• <strong>TERMINATED</strong>: Transferencia finalizada<br>' +
                        '<small>⌛ Esto puede tardar 5-30 segundos. Usa "Refresh Status" para actualizar.</small>' +
                        '</div>';
                } else if (transfer.state === 'STARTING' || transfer.state === 'STARTED') {
                    stateMessage = '<div style="background: #e8f5e9; padding: 10px; margin-top: 10px; border-radius: 4px; font-size: 12px; color: #2e7d32;">✅ Transferencia iniciada. El EDC está preparando el data endpoint.</div>';
                } else if (transfer.state === 'COMPLETED') {
                    stateMessage = '<div style="background: #e8f5e9; padding: 10px; margin-top: 10px; border-radius: 4px; font-size: 12px; color: #2e7d32;">🎉 Transferencia completada exitosamente.</div>';
                } else if (transfer.state === 'TERMINATED') {
                    stateMessage = '<div style="background: #fff3cd; padding: 10px; margin-top: 10px; border-radius: 4px; font-size: 12px; color: #856404;">⚠️ Transferencia terminada. Si el EDR no está disponible, usa el botón "Debug EDR" para investigar.</div>';
                } else if (transfer.state === 'FAILED') {
                    const errorDetail = transfer.errorDetail ? transfer.errorDetail.substring(0, 200) : 'Error desconocido';
                    stateMessage = `<div style="background: #ffebee; padding: 10px; margin-top: 10px; border-radius: 4px; font-size: 12px; color: #c62828;">❌ Error: ${errorDetail}</div>`;
                }
                
                card.innerHTML = `
                    <div class="negotiation-card-header">
                        <div>
                            <span class="transfer-status ${statusClass}">${transfer.state}</span>
                        </div>
                    </div>
                    <div class="negotiation-details">
                        <div class="negotiation-info-item">
                            <span class="negotiation-info-label">Transfer ID</span>
                            <span class="negotiation-info-value">${transfer.id}</span>
                        </div>
                        <div class="negotiation-info-item">
                            <span class="negotiation-info-label">Asset ID</span>
                            <span class="negotiation-info-value">${transfer.assetId}</span>
                        </div>
                        <div class="negotiation-info-item">
                            <span class="negotiation-info-label">Contract ID</span>
                            <span class="negotiation-info-value">${transfer.contractId}</span>
                        </div>
                        <div class="negotiation-info-item">
                            <span class="negotiation-info-label">Counter Party</span>
                            <span class="negotiation-info-value">${transfer.counterPartyId || 'N/A'}</span>
                        </div>
                        <div class="negotiation-info-item">
                            <span class="negotiation-info-label">Created At</span>
                            <span class="negotiation-info-value">${timeStr}</span>
                        </div>
                        ${transfer.edrEndpoint ? `
                        <div class="negotiation-info-item">
                            <span class="negotiation-info-label">📍 Data Endpoint</span>
                            <span class="negotiation-info-value" style="font-size: 11px; word-break: break-all;">${transfer.edrEndpoint}</span>
                        </div>
                        ` : ''}
                    </div>
                    ${stateMessage}
                    ${transfer.edrAvailable ? `
                    <div style="background: #e8f5e9; padding: 10px; margin-top: 10px; border-radius: 4px; font-size: 12px; color: #2e7d32; border: 1px solid #4caf50;">
                        <strong>✅ EDR Disponible</strong><br>
                        El Endpoint Data Reference está listo. Puedes descargar el fichero.
                        ${transfer.edrToken ? '<br><small>Token de autenticación disponible</small>' : ''}
                    </div>
                    ` : ''}
                    <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
                        <button class="btn-transfer" onclick="phase6RefreshTransfers()" style="flex: 1; min-width: 120px;">
                            🔄 Refresh Status
                        </button>
                        ${transfer.edrAvailable && transfer.edrEndpoint ? `
                        <button class="btn-negotiate-enhanced" onclick="phase6ShowToken('${transfer.id}')" style="flex: 1; min-width: 120px; background: #2196F3;">
                            🔑 Get Token
                        </button>
                        <button class="btn-negotiate-enhanced" onclick="phase6ShowCurl('${transfer.id}', '${transfer.edrEndpoint}', '${transfer.edrToken || ''}')" style="flex: 1; min-width: 120px; background: #673AB7;">
                            📋 Show cURL
                        </button>
                        <button class="btn-negotiate-enhanced" onclick="phase6DownloadData('${transfer.id}', '${transfer.edrEndpoint}', '${transfer.edrToken || ''}')" style="flex: 1; min-width: 120px;">
                            📥 Download File
                        </button>
                        ` : `
                        <button class="btn-transfer" onclick="phase6DebugTransfer('${transfer.id}')" style="flex: 1; min-width: 120px; background: #ff9800;">
                            🔍 Debug EDR
                        </button>
                        `}
                    </div>
                    <div id="token-display-${transfer.id}" style="display: none; margin-top: 12px; background: #f5f5f5; padding: 12px; border-radius: 4px; border: 1px solid #ddd;">
                        <div style="margin-bottom: 8px; font-weight: bold; color: #2196F3;">🔑 Authorization Token</div>
                        <textarea id="token-value-${transfer.id}" readonly style="width: 100%; min-height: 80px; padding: 8px; font-family: monospace; font-size: 11px; border: 1px solid #ccc; border-radius: 4px; background: white; resize: vertical;"></textarea>
                        <div style="margin-top: 8px; display: flex; gap: 8px;">
                            <button class="btn-transfer" onclick="phase6CopyToken('${transfer.id}')" style="flex: 1;">
                                📋 Copy Token
                            </button>
                            <button class="btn-transfer" onclick="phase6RefreshToken('${transfer.id}')" style="flex: 1;">
                                🔄 Refresh Token
                            </button>
                            <button class="btn-transfer" onclick="phase6HideToken('${transfer.id}')" style="flex: 1; background: #757575;">
                                ✖️ Hide
                            </button>
                        </div>
                        <div id="token-info-${transfer.id}" style="margin-top: 8px; font-size: 11px; color: #666;"></div>
                    </div>
                    <div id="curl-display-${transfer.id}" style="display: none; margin-top: 12px; background: #f5f5f5; padding: 12px; border-radius: 4px; border: 1px solid #673AB7;">
                        <div style="margin-bottom: 8px; font-weight: bold; color: #673AB7;">📋 cURL Command</div>
                        <div style="margin-bottom: 8px; font-size: 12px; color: #666;">Este es el comando exacto que se envía al Data Plane al pulsar "Download File":</div>
                        <textarea id="curl-value-${transfer.id}" readonly style="width: 100%; min-height: 120px; padding: 8px; font-family: monospace; font-size: 11px; border: 1px solid #ccc; border-radius: 4px; background: #282c34; color: #61dafb; resize: vertical;"></textarea>
                        <div style="margin-top: 8px; display: flex; gap: 8px;">
                            <button class="btn-transfer" onclick="phase6CopyCurl('${transfer.id}')" style="flex: 1;">
                                📋 Copy cURL
                            </button>
                            <button class="btn-transfer" onclick="phase6TestCurl('${transfer.id}')" style="flex: 1; background: #4CAF50;">
                                ▶️ Test in Terminal
                            </button>
                            <button class="btn-transfer" onclick="phase6HideCurl('${transfer.id}')" style="flex: 1; background: #757575;">
                                ✖️ Hide
                            </button>
                        </div>
                        <div id="curl-info-${transfer.id}" style="margin-top: 8px; font-size: 11px; color: #666;"></div>
                    </div>
                `;
                
                transfersList.appendChild(card);
            });
        }
        
        // Descargar fichero usando el EDR endpoint (a través del backend como proxy)
        async function phase6DownloadData(transferId, edrEndpoint, edrToken) {
            addLog(6, `\n📥 Iniciando descarga desde EDR...`);
            addLog(6, `Transfer ID: ${transferId}`);
            addLog(6, `Endpoint: ${edrEndpoint}`);
            
            try {
                if (!edrToken) {
                    addLog(6, `❌ Error: No hay token de autorización disponible`);
                    return;
                }
                
                addLog(6, `✅ Usando token de autorización`);
                addLog(6, `🔄 Solicitando descarga al backend (evitando CORS)...`);
                
                // Hacer la petición al backend, que actuará como proxy
                // El backend consultará el EDR actualizado si el token expiró
                const response = await fetch(`${API_BASE}/phase6/download-file`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        transferId: transferId,
                        endpoint: edrEndpoint,
                        token: edrToken
                    })
                });
                
                addLog(6, `📡 HTTP ${response.status}`);
                
                if (response.ok) {
                    // Obtener el contenido como blob
                    const blob = await response.blob();
                    const contentType = response.headers.get('content-type') || 'application/octet-stream';
                    
                    addLog(6, `✅ Descarga exitosa! Tamaño: ${(blob.size / 1024).toFixed(2)} KB`);
                    addLog(6, `📄 Content-Type: ${contentType}`);
                    
                    // Extraer nombre del fichero del Content-Disposition si existe
                    const contentDisposition = response.headers.get('content-disposition');
                    let filename = 'downloaded-file';
                    
                    if (contentDisposition && contentDisposition.includes('filename=')) {
                        const matches = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                        if (matches && matches[1]) {
                            filename = matches[1].replace(/['"]/g, '');
                        }
                    } else {
                        // Generar nombre basado en content-type
                        if (contentType.includes('csv')) {
                            filename = 'data.csv';
                        } else if (contentType.includes('pdf')) {
                            filename = 'data.pdf';
                        } else if (contentType.includes('json')) {
                            filename = 'data.json';
                        } else if (contentType.includes('xml')) {
                            filename = 'data.xml';
                        } else {
                            filename = 'data.dat';
                        }
                    }
                    
                    // Crear un link temporal y simular el click para descargar
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    window.URL.revokeObjectURL(url);
                    document.body.removeChild(a);
                    
                    addLog(6, `💾 Fichero guardado como: ${filename}`);
                    addLog(6, `🎉 ¡Descarga completada exitosamente!`);
                } else {
                    // Intentar parsear el error como JSON
                    try {
                        const errorData = await response.json();
                        addLog(6, `❌ Error HTTP ${response.status}: ${errorData.error || response.statusText}`);
                        if (errorData.details) {
                            addLog(6, `Detalle: ${errorData.details.substring(0, 200)}`);
                        }
                    } catch {
                        const errorText = await response.text();
                        addLog(6, `❌ Error HTTP ${response.status}: ${response.statusText}`);
                        addLog(6, `Detalle: ${errorText.substring(0, 200)}`);
                    }
                }
            } catch (error) {
                addLog(6, `❌ Error al descargar: ${error.message}`);
                console.error('Download error:', error);
            }
        }
        
        // Mostrar el token de autorización del EDR
        async function phase6ShowToken(transferId) {
            addLog(6, `\n🔑 Obteniendo token de autorización...`);
            addLog(6, `Transfer ID: ${transferId}`);
            
            try {
                // Buscar el transfer en la lista actual
                const transfer = phase6Transfers.find(t => t.id === transferId);
                
                if (!transfer) {
                    addLog(6, `❌ Error: Transfer no encontrado`);
                    return;
                }
                
                // Mostrar el contenedor del token
                const tokenDisplay = document.getElementById(`token-display-${transferId}`);
                const tokenValue = document.getElementById(`token-value-${transferId}`);
                const tokenInfo = document.getElementById(`token-info-${transferId}`);
                
                if (!tokenDisplay || !tokenValue || !tokenInfo) {
                    addLog(6, `❌ Error: Elementos de UI no encontrados`);
                    return;
                }
                
                // Si ya tiene token en caché, usarlo
                let token = transfer.edrToken;
                let endpoint = transfer.edrEndpoint;
                
                // Si no hay token o queremos refrescarlo, consultar el EDR actual
                if (!token) {
                    addLog(6, `📡 Consultando EDR actualizado...`);
                    
                    const result = await callAPI(`/phase6/get-fresh-token/${transferId}`, 'GET');
                    
                    if (result.success && result.token) {
                        token = result.token;
                        endpoint = result.endpoint;
                        addLog(6, `✅ Token obtenido exitosamente`);
                    } else {
                        addLog(6, `❌ Error al obtener token: ${result.error || 'Desconocido'}`);
                        return;
                    }
                }
                
                // Actualizar la UI
                tokenValue.value = token;
                tokenDisplay.style.display = 'block';
                
                // Decodificar el JWT para obtener información
                try {
                    const parts = token.split('.');
                    if (parts.length === 3) {
                        const payload = JSON.parse(atob(parts[1]));
                        const exp = payload.exp;
                        
                        if (exp) {
                            const expiryDate = new Date(exp * 1000);
                            const now = new Date();
                            const minutesLeft = Math.floor((expiryDate - now) / 1000 / 60);
                            
                            if (minutesLeft > 0) {
                                tokenInfo.innerHTML = `✅ Token válido por ${minutesLeft} minutos más (expira: ${expiryDate.toLocaleString('es-ES')})`;
                                tokenInfo.style.color = '#2e7d32';
                            } else {
                                tokenInfo.innerHTML = `⚠️ Token expirado. Usa "Refresh Token" para obtener uno nuevo.`;
                                tokenInfo.style.color = '#d32f2f';
                            }
                        }
                    }
                } catch (e) {
                    tokenInfo.innerHTML = `📍 Endpoint: ${endpoint}`;
                    tokenInfo.style.color = '#666';
                }
                
                addLog(6, `✅ Token mostrado. Puedes copiarlo al portapapeles.`);
                
            } catch (error) {
                addLog(6, `❌ Error: ${error.message}`);
                console.error('Show token error:', error);
            }
        }
        
        // Copiar token al portapapeles
        async function phase6CopyToken(transferId) {
            const tokenValue = document.getElementById(`token-value-${transferId}`);
            
            if (!tokenValue || !tokenValue.value) {
                addLog(6, `❌ Error: No hay token para copiar`);
                return;
            }
            
            try {
                await navigator.clipboard.writeText(tokenValue.value);
                addLog(6, `📋 Token copiado al portapapeles`);
                
                // Feedback visual temporal
                const originalBg = tokenValue.style.background;
                tokenValue.style.background = '#c8e6c9';
                setTimeout(() => {
                    tokenValue.style.background = originalBg;
                }, 500);
            } catch (error) {
                addLog(6, `❌ Error al copiar: ${error.message}`);
                // Fallback: seleccionar el texto
                tokenValue.select();
                addLog(6, `💡 Token seleccionado. Usa Ctrl+C para copiar.`);
            }
        }
        
        // Refrescar token (obtener uno nuevo)
        async function phase6RefreshToken(transferId) {
            addLog(6, `\n🔄 Refrescando token de autorización...`);
            
            try {
                const result = await callAPI(`/phase6/get-fresh-token/${transferId}`, 'GET');
                
                if (result.success && result.token) {
                    const tokenValue = document.getElementById(`token-value-${transferId}`);
                    const tokenInfo = document.getElementById(`token-info-${transferId}`);
                    
                    if (tokenValue) {
                        tokenValue.value = result.token;
                        
                        // Actualizar el transfer en la lista global
                        const transfer = phase6Transfers.find(t => t.id === transferId);
                        if (transfer) {
                            transfer.edrToken = result.token;
                            transfer.edrEndpoint = result.endpoint;
                        }
                        
                        addLog(6, `✅ Token actualizado exitosamente`);
                        
                        // Actualizar info de expiración
                        try {
                            const parts = result.token.split('.');
                            if (parts.length === 3) {
                                const payload = JSON.parse(atob(parts[1]));
                                const exp = payload.exp;
                                
                                if (exp) {
                                    const expiryDate = new Date(exp * 1000);
                                    const now = new Date();
                                    const minutesLeft = Math.floor((expiryDate - now) / 1000 / 60);
                                    
                                    if (tokenInfo) {
                                        tokenInfo.innerHTML = `✅ Token válido por ${minutesLeft} minutos (expira: ${expiryDate.toLocaleString('es-ES')})`;
                                        tokenInfo.style.color = '#2e7d32';
                                    }
                                }
                            }
                        } catch (e) {
                            if (tokenInfo) {
                                tokenInfo.innerHTML = `✅ Token actualizado`;
                                tokenInfo.style.color = '#2e7d32';
                            }
                        }
                    }
                } else {
                    addLog(6, `❌ Error al refrescar token: ${result.error || 'Desconocido'}`);
                }
            } catch (error) {
                addLog(6, `❌ Error: ${error.message}`);
                console.error('Refresh token error:', error);
            }
        }
        
        // Ocultar la sección de token
        function phase6HideToken(transferId) {
            const tokenDisplay = document.getElementById(`token-display-${transferId}`);
            if (tokenDisplay) {
                tokenDisplay.style.display = 'none';
            }
        }
        
        // Mostrar el comando cURL equivalente
        async function phase6ShowCurl(transferId, endpoint, token) {
            addLog(6, `\n📋 Generando comando cURL...`);
            addLog(6, `Transfer ID: ${transferId}`);
            
            try {
                // Si no hay token, obtener uno fresco
                if (!token) {
                    addLog(6, `📡 Obteniendo token actualizado...`);
                    const result = await callAPI(`/phase6/get-fresh-token/${transferId}`, 'GET');
                    
                    if (result.success && result.token) {
                        token = result.token;
                        endpoint = result.endpoint;
                        addLog(6, `✅ Token obtenido`);
                    } else {
                        addLog(6, `❌ Error al obtener token: ${result.error || 'Desconocido'}`);
                        return;
                    }
                }
                
                // EDC Data Plane espera el token SIN el prefijo "Bearer "
                // (formato verificado en UI edc-consumer que funciona correctamente)
                let authHeader = token;
                if (token.startsWith('Bearer ')) {
                    authHeader = token.substring(7);  // Eliminar "Bearer " (7 caracteres)
                }
                
                // Generar el comando cURL sin "Bearer " en Authorization
                const curlCommand = `curl -X GET '${endpoint}' \\
  -H 'Authorization: ${authHeader}' \\
  -H 'Accept: */*' \\
  --insecure \\
  --output downloaded-file.csv`;
                
                // Mostrar el panel y actualizar el contenido
                const curlDisplay = document.getElementById(`curl-display-${transferId}`);
                const curlValue = document.getElementById(`curl-value-${transferId}`);
                const curlInfo = document.getElementById(`curl-info-${transferId}`);
                
                if (!curlDisplay || !curlValue || !curlInfo) {
                    addLog(6, `❌ Error: Elementos de UI no encontrados`);
                    return;
                }
                
                curlValue.value = curlCommand;
                curlDisplay.style.display = 'block';
                
                // Información adicional
                curlInfo.innerHTML = `✅ Comando generado. <strong>Nota:</strong> El token expira en ~5 minutos. ` +
                    `Endpoint: <code style="font-size: 10px;">${endpoint}</code>`;
                curlInfo.style.color = '#666';
                
                addLog(6, `✅ Comando cURL generado y mostrado`);
                addLog(6, `💡 Puedes copiarlo y ejecutarlo en tu terminal`);
                
            } catch (error) {
                addLog(6, `❌ Error: ${error.message}`);
                console.error('Show cURL error:', error);
            }
        }
        
        // Copiar comando cURL al portapapeles
        async function phase6CopyCurl(transferId) {
            const curlValue = document.getElementById(`curl-value-${transferId}`);
            
            if (!curlValue || !curlValue.value) {
                addLog(6, `❌ Error: No hay comando cURL para copiar`);
                return;
            }
            
            try {
                await navigator.clipboard.writeText(curlValue.value);
                addLog(6, `📋 Comando cURL copiado al portapapeles`);
                addLog(6, `💡 Puedes pegarlo en tu terminal y ejecutarlo`);
                
                // Feedback visual temporal
                const originalBg = curlValue.style.background;
                curlValue.style.background = '#1e3a1e';
                setTimeout(() => {
                    curlValue.style.background = originalBg;
                }, 500);
            } catch (error) {
                addLog(6, `❌ Error al copiar: ${error.message}`);
                // Fallback: seleccionar el texto
                curlValue.select();
                addLog(6, `💡 Comando seleccionado. Usa Ctrl+C para copiar.`);
            }
        }
        
        // Dar instrucciones para probar el comando cURL
        function phase6TestCurl(transferId) {
            const curlValue = document.getElementById(`curl-value-${transferId}`);
            
            if (!curlValue || !curlValue.value) {
                addLog(6, `❌ Error: No hay comando cURL`);
                return;
            }
            
            addLog(6, `\n▶️ Para probar el comando cURL:`);
            addLog(6, ``);
            addLog(6, `1️⃣ Copia el comando pulsando "📋 Copy cURL"`);
            addLog(6, `2️⃣ Abre una terminal en tu sistema`);
            addLog(6, `3️⃣ Pega y ejecuta el comando`);
            addLog(6, `4️⃣ El archivo se descargará como "downloaded-file.csv"`);
            addLog(6, ``);
            addLog(6, `⚠️ IMPORTANTE: El token expira en ~5 minutos.`);
            addLog(6, `   Si obtienes HTTP 403, pulsa "🔄 Refresh Token" y genera el cURL de nuevo.`);
            addLog(6, ``);
            addLog(6, `✅ Ejemplo de salida esperada:`);
            addLog(6, `   % Total    % Received  Time    Time     Current`);
            addLog(6, `                            Total   Spent    Speed`);
            addLog(6, `   100  1234  100  1234     0     0   5432     0 --:--:-- --:--:--`);
        }
        
        // Ocultar la sección de cURL
        function phase6HideCurl(transferId) {
            const curlDisplay = document.getElementById(`curl-display-${transferId}`);
            if (curlDisplay) {
                curlDisplay.style.display = 'none';
            }
        }
        
        // Debug de un transfer process para ver por qué no hay EDR
        async function phase6DebugTransfer(transferId) {
            clearLogs(6);
            addLog(6, `🔍 Debug de Transfer Process: ${transferId}`);
            addLog(6, `Consultando información detallada...`);
            addLog(6, '');
            
            const result = await callAPI(`/phase6/debug-transfer/${transferId}`, 'GET');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(6, log));
            }
            
            if (result.success) {
                addLog(6, '');
                addLog(6, '✅ Debug completado. Revisa la información arriba para');
                addLog(6, '   entender por qué el EDR no está disponible.');
            }
        }
        
        // Limpiar transferencias antiguas
        async function phase6CleanupTransfers() {
            if (!confirm('⚠️ ¿Seguro que quieres eliminar todas las transferencias TERMINATED/FAILED del conector IKLN?\n\nEsto no se puede deshacer.')) {
                return;
            }
            
            clearLogs(6);
            addLog(6, '🧹 Limpiando transferencias antiguas...');
            addLog(6, '');
            
            const result = await callAPI('/phase6/cleanup-transfers', 'POST', { connector: 'ikln' });
            
            if (result.logs) {
                result.logs.forEach(log => addLog(6, log));
            }
            
            if (result.success) {
                addLog(6, '');
                addLog(6, '🔄 Actualizando lista de transferencias...');
                await phase6RefreshTransfers();
            }
        }
        
        // Diagnosticar problema del data plane
        async function phase6DiagnoseDataplane() {
            clearLogs(6);
            addLog(6, '🔬 Iniciando diagnóstico del Data Plane...');
            addLog(6, '⏳ Analizando logs de los pods...');
            addLog(6, '');
            
            const result = await callAPI('/phase6/diagnose-dataplane', 'GET');
            
            if (result.logs) {
                result.logs.forEach(log => addLog(6, log));
            }
        }

        // Mantener funciones antiguas por compatibilidad
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
