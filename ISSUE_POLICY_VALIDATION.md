# Issue: Validación de Políticas ODRL en EDC Tractus-X

**Fecha:** 16 de Marzo de 2026  
**Componente:** EDC Management API - PolicyDefinitions  
**Versión:** Tractus-X Umbrella 2.8.0 (Release 24.05)  
**Severidad:** Bloqueante

---

## Problema

Al intentar crear políticas ODRL con constraints de Catena-X, el validador del EDC Management API devuelve **errores contradictorios** sobre qué operadores usar, haciendo imposible crear políticas válidas.

## Descripción Técnica

### Constraints Requeridos (Obligatorios)

Según los errores del validador, estos 3 constraints son obligatorios:

1. `https://w3id.org/catenax/2025/9/policy/BusinessPartnerNumber`
2. `https://w3id.org/catenax/2025/9/policy/FrameworkAgreement`
3. `https://w3id.org/catenax/2025/9/policy/UsagePurpose`

### Errores Contradictorios

#### Escenario 1: Usando `odrl:isAnyOf` para todos los constraints

**Payload:**
```json
{
  "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
  "@type": "PolicyDefinition",
  "@id": "test-policy",
  "policy": {
    "@type": "odrl:Set",
    "odrl:permission": [{
      "odrl:action": {"@id": "http://www.w3.org/ns/odrl/2/use"},
      "odrl:constraint": [
        {
          "@type": "Constraint",
          "odrl:leftOperand": {"@id": "https://w3id.org/catenax/2025/9/policy/BusinessPartnerNumber"},
          "odrl:operator": {"@id": "odrl:isAnyOf"},
          "odrl:rightOperand": ["BPNL00000002IKLN"]
        },
        {
          "@type": "Constraint",
          "odrl:leftOperand": {"@id": "https://w3id.org/catenax/2025/9/policy/FrameworkAgreement"},
          "odrl:operator": {"@id": "odrl:isAnyOf"},
          "odrl:rightOperand": ["DataExchangeGovernance:1.0"]
        },
        {
          "@type": "Constraint",
          "odrl:leftOperand": {"@id": "https://w3id.org/catenax/2025/9/policy/UsagePurpose"},
          "odrl:operator": {"@id": "odrl:isAnyOf"},
          "odrl:rightOperand": ["cx.core.industrycore:1"]
        }
      ]
    }]
  }
}
```

**Error recibido (Status 400):**
```json
[
  {
    "message": "Invalid operator: this constraint only allows the following operators: EQ, but received 'IS_ANY_OF'.",
    "type": "InvalidRequest"
  },
  {
    "message": "Invalid operator: this constraint only allows the following operators: EQ, but received 'IS_ANY_OF'.",
    "type": "InvalidRequest"
  },
  {
    "message": "Invalid operator: this constraint only allows the following operators: EQ, but received 'IS_ANY_OF'.",
    "type": "InvalidRequest"
  }
]
```

---

#### Escenario 2: Usando `odrl:eq` para todos los constraints

**Payload:**
```json
{
  "@context": ["https://w3id.org/edc/connector/management/v0.0.1"],
  "@type": "PolicyDefinition",
  "@id": "test-policy",
  "policy": {
    "@type": "odrl:Set",
    "odrl:permission": [{
      "odrl:action": {"@id": "http://www.w3.org/ns/odrl/2/use"},
      "odrl:constraint": [
        {
          "@type": "Constraint",
          "odrl:leftOperand": {"@id": "https://w3id.org/catenax/2025/9/policy/BusinessPartnerNumber"},
          "odrl:operator": {"@id": "odrl:eq"},
          "odrl:rightOperand": "BPNL00000002IKLN"
        },
        {
          "@type": "Constraint",
          "odrl:leftOperand": {"@id": "https://w3id.org/catenax/2025/9/policy/FrameworkAgreement"},
          "odrl:operator": {"@id": "odrl:eq"},
          "odrl:rightOperand": "DataExchangeGovernance:1.0"
        },
        {
          "@type": "Constraint",
          "odrl:leftOperand": {"@id": "https://w3id.org/catenax/2025/9/policy/UsagePurpose"},
          "odrl:operator": {"@id": "odrl:eq"},
          "odrl:rightOperand": "cx.core.industrycore:1"
        }
      ]
    }]
  }
}
```

**Error recibido (Status 400):**
```json
[
  {
    "message": "Invalid operator: this constraint only allows the following operators: [IS_ANY_OF, IS_NONE_OF], but received 'EQ'.",
    "type": "InvalidRequest"
  },
  {
    "message": "Invalid operator: this constraint only allows the following operators: [IS_ANY_OF], but received 'EQ'.",
    "type": "InvalidRequest"
  },
  {
    "message": "Invalid operator: this constraint only allows the following operators: [IS_ANY_OF], but received 'EQ'.",
    "type": "InvalidRequest"
  }
]
```

---

#### Escenario 3: Combinaciones mixtas

Se probaron **21 variaciones diferentes** combinando:
- Operadores: `eq`, `isAnyOf`, `isNoneOf`
- Formatos de rightOperand: strings vs arrays
- Diferentes namespaces: 2024/05, 2025/9, sin versión
- Con y sin `@context` de ODRL

**Resultado:** Ninguna variación funcionó. Todas devolvieron errores contradictorios.

---

## Pruebas Realizadas

**Script de prueba:** `/ui/scripts/test-policy-variations.ts`

**Comando:**
```bash
cd /home/xmendialdua/projects/assembly/iflex/ui && npx tsx scripts/test-policy-variations.ts
```

**Resultados:**
- Total de variaciones probadas: **21**
- Variaciones exitosas: **0**
- Todas fallaron con errores 400 (Bad Request)

---

## Hallazgos Confirmados

✅ **Correctos:**
1. Namespace: `https://w3id.org/catenax/2025/9/policy/`
2. Estructura de leftOperand: `{"@id": "URL"}` (siempre objeto con @id)
3. Los 3 constraints son obligatorios: BusinessPartnerNumber, FrameworkAgreement, UsagePurpose
4. Context del PolicyDefinition: `["https://w3id.org/edc/connector/management/v0.0.1"]`
5. Action debe ser: `{"@id": "http://www.w3.org/ns/odrl/2/use"}`

❌ **Sin resolver:**
- Qué operadores usar para cada constraint
- Formato exacto de rightOperand (string vs array)

---

## Posibles Causas

### 1. Bug en el Validador del EDC
Los mensajes contradictorios sugieren un bug en la lógica de validación de políticas.

### 2. Configuración Faltante del Conector
El conector EDC puede requerir configuración adicional de "policy scopes" que define qué operadores son válidos para cada constraint.

**Variables a revisar:**
```
TX_EDC_POLICY_*
EDC_IAM_POLICY_*
EDC_POLICY_SCOPE_*
```

### 3. Versión Incompatible
La versión del tractusx-edc puede no estar completamente alineada con el namespace 2025/9.

### 4. Falta de Configuración de Policy Hub
El Policy Hub de Tractus-X debe estar configurado con las reglas de validación correctas.

---

## Acciones Recomendadas

### Corto Plazo

1. **Revisar logs del Control Plane EDC:**
   ```bash
   kubectl logs -n <namespace> <edc-mass-control-pod> --tail=200
   ```
   Buscar mensajes más detallados sobre validación de políticas.

2. **Verificar configuración del deployment:**
   ```bash
   kubectl get configmap -n <namespace> | grep edc
   kubectl describe configmap <edc-configmap> -n <namespace>
   ```

3. **Consultar versión exacta del EDC:**
   ```bash
   kubectl describe pod <edc-pod> -n <namespace> | grep -i image
   ```

### Medio Plazo

4. **Consultar Tractus-X Community:**
   - GitHub Issues: https://github.com/eclipse-tractusx/tractusx-edc/issues
   - Matrix Chat: https://chat.eclipse.org/#/room/#tractusx-dev:matrix.eclipse.org

5. **Revisar ejemplos oficiales:**
   - Buscar en repositorio umbrella ejemplos de políticas funcionando
   - Revisar tests de integración del tractusx-edc

6. **Considerar actualización:**
   - Verificar si Release 24.08 resuelve el problema
   - Revisar changelog entre versiones

### Largo Plazo

7. **Reportar bug (si se confirma):**
   - Crear issue en repositorio tractusx-edc con reproducción completa
   - Incluir logs y resultados de las 21 variaciones probadas

---

## Workaround Temporal

Mientras se resuelve el problema, considerar:

1. **Políticas sin restricciones de BPN** (no recomendado para producción):
   ```json
   {
     "@type": "odrl:Set",
     "odrl:permission": [{
       "odrl:action": {"@id": "http://www.w3.org/ns/odrl/2/use"}
     }]
   }
   ```

2. **Gestión manual de políticas:**
   - Crear políticas directamente en la base de datos PostgreSQL del EDC
   - Bypass del Management API (requiere acceso directo a BD)

3. **Uso de versión anterior del EDC:**
   - Downgrade temporal a versión con namespace 2024 conocido

---

## Referencias

- **Tractus-X EDC:** https://github.com/eclipse-tractusx/tractusx-edc
- **ODRL Spec:** https://www.w3.org/TR/odrl-model/
- **Catena-X Policy Framework:** https://github.com/catenax-eV/cx-odrl-profile
- **Script de prueba:** `/ui/scripts/test-policy-variations.ts`
- **Listado de políticas:** `/ui/scripts/list-policies.ts`

---

## Estado

🔴 **BLOQUEADO** - No es posible crear políticas ODRL válidas con el validador actual.

**Última actualización:** 16 de Marzo de 2026  
**Responsable:** Equipo de Desarrollo Mondragon Assembly  
**Prioridad:** Alta - Bloquea funcionalidad de publicación de assets con políticas
