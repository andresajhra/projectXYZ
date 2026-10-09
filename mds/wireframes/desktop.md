# Pharma ERP — Desktop Application Wireframes & Peripheral Control Specification

Este documento define la arquitectura de escritorio, integración de hardware nativo y pantallas especializadas de **apps/desktop**, construida como un contenedor nativo **Tauri 2 (Rust)** que aloja la interfaz web y expone comandos IPC para periféricos de punto de venta (impresoras térmicas ESC/POS, gavetas de dinero RJ11, balanzas RS-232 y bóveda local de certificados `.p12` para firma offline).

---

## 1. Arquitectura de Integración de Hardware Periférico (Tauri 2 IPC)

```mermaid
flowchart TD
    subgraph WebRenderer["Interfaz Web (Webview2 / WebKit)"]
        UI["UI POS Mostrador (React 19)"]
        HOOK["usePlatform() & tauriInvoke()"]
        UI --> HOOK
    end

    subgraph TauriBridge["Puente Tauri 2 IPC (Rust)"]
        IPC["tauri::generate_handler!"]
        HOOK -->|"invoke('printer_print_ticket', { payload })"| IPC
        HOOK -->|"invoke('drawer_kick')"| IPC
        HOOK -->|"invoke('scale_read_weight')"| IPC
        HOOK -->|"invoke('signer_sign_xml_local', { xml })"| IPC
    end

    subgraph RustDrivers["Capa de Drivers Nativos (apps/desktop/src-tauri)"]
        PRN_DRV["ESC/POS Driver\n(Raw USB / WinSpool / TCP 9100)"]
        DRW_DRV["Cash Drawer Kicker\n(ESC p 0 25 250 pulse)"]
        SCL_DRV["Scale Serial Worker\n(RS-232 / 9600 baud polling)"]
        VAULT_DRV["Secure Keystore Vault\n(Windows DPAPI / Apple Keychain)"]
    end

    subgraph PhysicalPeripherals["Dispositivos Físicos de Mostrador"]
        PRN[Impresora Térmica 80mm\n(Epson TM-T20 / Bixolon)]
        DRW[Gaveta de Dinero Metálica\n(Conexión RJ11 a Impresora)]
        SCL[Balanza Analítica / Granataria\n(Puerto Serial COM3)]
        CERT[Certificado Digital .p12\n(Firma XML-DSig Local)]
    end

    IPC --> PRN_DRV --> PRN
    IPC --> DRW_DRV --> DRW
    IPC --> SCL_DRV --> SCL
    IPC --> VAULT_DRV --> CERT
```

---

## 2. Pantalla 1: POS de Alta Velocidad para Cajero Fijo (Optimizado para Teclado)

Diseñada para transacciones ultrarrápidas en mostrador físico. El cajero no requiere usar el ratón; cada acción tiene un atajo de función (F1-F12) o comando de teclado numérico.

### 2.1 Wireframe

```
+---------------------------------------------------------------------------------------------------+
| [TAURI NATIVE] PHARMA ERP DESKTOP - CAJA 01 | SUCURSAL CENTRAL | [ONLINE: CUFD VIGENTE] [GAVETA OK] |
+---------------------------------------------------------------------------------------------------+
| BARCODE / BÚSQUEDA RÁPIDA: [ 7770128490123___________________ ]  [BALANZA: 0.250 kg ESTABLE]      |
| (Ejemplo de ingreso rápido: '3*77701' = 3 cajas | '10/77701' = 10 comprimidos sueltos)            |
+---------------------------------------------------------------------------------------------------+
| #  CÓDIGO   DESCRIPCIÓN             LOTE     VENCE    CANT   UNIDAD     P.UNIT     DESC     TOTAL |
| -- -------- ----------------------- -------- -------- ------ ---------- --------- -------- ------|
| 1  77701284 Amoxicilina 500mg       AMX-009  19 días    1    CAJA (10u)  Bs 35.00   0.00   Bs 35.00|
| 2  77701991 Paracetamol 500mg       L-202    12 días   10    COMPRIMIDO  Bs  0.50   0.00   Bs  5.00|
| 3  77901844 Alcohol en Gel 70% 250ml ALC-44  180 días   2    FRASCO      Bs 12.00   0.00   Bs 24.00|
| 4  77801999 Fórm. Magistral (Sulf)  MG-01    30 días  0.250  KILOGRAMO   Bs 80.00   0.00   Bs 20.00|
|                                                                                                   |
|                                                                                                   |
+-------------------------------------------------------------------+-------------------------------+
| CLIENTE FACTURACIÓN                                               | TOTALES Y COBRO RÁPIDO        |
| [F3] NIT/CI: [ 4892019012       ] [F7] Excepción NIT: [ ]         | Cantidad Artículos:       14  |
| Razón Social: [ Juan Pérez Gómez                                ] | Subtotal:           Bs  84.00 |
| Correo Factura: [ jperez@gmail.com                              ] | Descuento:          Bs   0.00 |
|                                                                   | ============================= |
| ATAJOS DE TECLADO:                                                | TOTAL GENERAL:      Bs  84.00 |
| [F1] Ayuda / Atajos     [F5] Abrir Gaveta     [F9]  Ajustar Cant  |                               |
| [F2] Buscar Catálogo    [F6] Cobro Tarjeta    [F10] Anular Línea  | EFECTIVO RECIBIDO:  [Bs 100.00|
| [F3] Cambiar Cliente    [F7] Cobro QR Bancario[F11] Espera Ticket | CAMBIO A ENTREGAR:  Bs  16.00 |
| [F4] COBRAR & IMPRIMIR  [F8] Fraccionar Comp  [ESC] Salir         | [  [F4] COBRAR (ENTER)  ]     |
+-------------------------------------------------------------------+-------------------------------+
```

---

## 3. Pantalla 2: Arqueo y Cierre Ciego de Caja ("Cash Drawer Reconciliation")

Procedimiento de apertura y cierre de turno. Para evitar fraudes, el cajero realiza un arqueo ciego ingresando el conteo físico de monedas y billetes antes de que el sistema revele el saldo teórico esperado.

### 3.1 Wireframe

```
+---------------------------------------------------------------------------------------------------+
| GESTIÓN DE TURNO Y ARQUEO CIEGO DE CAJA                           [Turno #104: Andrés Sandoval]   |
+---------------------------------------------------------------------------------------------------+
| Estación: Terminal Mostrador 01 | Sucursal: Central | Hora Apertura: 08:00 AM | Hora: 18:30 PM    |
+-------------------------------------------------------------------+-------------------------------+
| CONTEO FÍSICO DE DENOMINACIONES EN GAVETA                         | ACCIONES DE GAVETA            |
|                                                                   |                               |
| BILLETES (CORTE)       CANTIDAD              SUBTOTAL (BS)        | [  [PULSAR] ABRIR GAVETA (F5) |
| ----------------------------------------------------------------- |                               |
| Bs 200                 [   2   ]             Bs  400.00           | [!] Se ha registrado apertura |
| Bs 100                 [  15   ]             Bs 1500.00           | de gaveta física por sensor.  |
| Bs  50                 [  20   ]             Bs 1000.00           |                               |
| Bs  20                 [  35   ]             Bs  700.00           +-------------------------------+
| Bs  10                 [  40   ]             Bs  400.00           | RESUMEN DE MOVIMIENTOS HOY    |
|                                                                   |                               |
| MONEDAS (CORTE)        CANTIDAD              SUBTOTAL (BS)        | Saldo Inicial Apertura: Bs 200|
| ----------------------------------------------------------------- | Ventas Efectivo:     Bs 3,845 |
| Bs   5                 [  12   ]             Bs   60.00           | Salidas (Gastos Menores): -45 |
| Bs   2                 [  20   ]             Bs   40.00           | Ventas QR (Al Banco): Bs 1,200|
| Bs   1                 [  25   ]             Bs   25.00           | Ventas Tarjeta POS:    Bs  950|
| Bs 0.50                [  16   ]             Bs    8.00           | ----------------------------- |
| ----------------------------------------------------------------- | SALDO TEÓRICO EN CAJA:        |
| TOTAL DINERO FÍSICO CONTADO:                 Bs 4,133.00          | Bs 4,000.00 (Efectivo neto)   |
|                                                                   | DIFERENCIA: +Bs 133.00 (SOBR.)|
| Motivo / Justificación de la diferencia:                          +-------------------------------+
| [ Donación redondeo y propinas en caja _________________________] | [  CONFIRMAR Y CERRAR TURNO ] |
+-------------------------------------------------------------------+-------------------------------+
```

---

## 4. Pantalla 3: Centro de Configuración de Periféricos & Diagnóstico

Permite vincular y calibrar el hardware físico instalado en la estación de trabajo de la farmacia.

### 4.1 Wireframe

```
+---------------------------------------------------------------------------------------------------+
| CONFIGURACIÓN DE PERIFÉRICOS DE ESCRITORIO (TAURI NATIVE)            [Guardar] [Probar Todo]      |
+---------------------------------------------------------------------------------------------------+
| 1. IMPRESORA TÉRMICA DE TICKETS FISCALES (ESC/POS)                                                |
|    Tipo de Conexión:    (o) USB Directo     ( ) Red LAN (TCP/IP)    ( ) Cola de Impresión Windows |
|    Dispositivo USB:     [ EPSON TM-T20III (Vendor: 0x04b8, Product: 0x0e28)                     v ]|
|    Ancho de Papel:      (o) 80 mm (48 columnas)    ( ) 58 mm (32 columnas)                        |
|    Juego de Caracteres: [ PC850 (Multilingual Latin I) v ]  Corte Automático: [x] Activado         |
|    [  >> ENVIAR TICKET DE PRUEBA ESC/POS  ]     Resultado: [ ÉXITO: Impresora Responde OK ]       |
+---------------------------------------------------------------------------------------------------+
| 2. GAVETA DE DINERO METÁLICA (RJ11 KICKER)                                                        |
|    Modo de Apertura:    (o) Conectada a puerto RJ11 de la impresora   ( ) Relé Serial COM         |
|    Secuencia ESC/POS:   [ ESC p 0 25 250 (Pin 2, 50ms pulse)                                    v ]|
|    Apertura Automática: [x] Abrir al confirmar cobro en efectivo                                   |
|    [  >> PROBAR APERTURA DE GAVETA (F5)  ]      Resultado: [ Pulso enviado a Pin 2 ]              |
+---------------------------------------------------------------------------------------------------+
| 3. BALANZA ELECTRÓNICA DE PRECISIÓN (RS-232 / USB SERIAL)                                         |
|    Puerto Serial:       [ COM3 (Prolific USB-to-Serial Comm Port)                               v ]|
|    Configuración:       Baud: [ 9600 v ] | Data: [ 8 ] | Parity: [ None ] | Stop: [ 1 ]             |
|    Lectura Continua:    [x] Activada cada 200 ms                                                  |
|    Lectura en Tiempo Real: [  0.250 kg (ESTABLE)  ]   [  >> TARAR BALANZA (CERO)  ]               |
+---------------------------------------------------------------------------------------------------+
| 4. BÓVEDA LOCAL DE CERTIFICADO DIGITAL SIAT (.p12 / .pfx)                                         |
|    Almacenamiento:      Protegido mediante Windows DPAPI (Cifrado con credencial de máquina)      |
|    Certificado Activo:  [ CN=FARMACIA SANTA CRUZ S.R.L., OU=FIRMA DIGITAL, EXP: 15/09/2027      ] |
|    Clave Privada:       [ ******************** ] (Almacenada de forma segura en memoria volátil)  |
|    Firma Local Offline: [x] Habilitada para Contingencia (XML-DSig RSA-SHA256 c14n)               |
+---------------------------------------------------------------------------------------------------+
```

---

## 5. Pantalla 4: Modo Contingencia & Monitor de Paquetes Offline

Cuando se corta la conexión a internet en la farmacia, la app de escritorio conmuta instantáneamente al modo seguro offline, continuando la venta legal con CAFC.

### 5.1 Wireframe

```
+---------------------------------------------------------------------------------------------------+
| [!] ALERTA CRÍTICA: MODO CONTINGENCIA OFFLINE ACTIVADO | MOTIVO: CORTE DE COMUNICACIÓN CON SIN    |
+---------------------------------------------------------------------------------------------------+
| El sistema está firmando facturas legalmente en local mediante el certificado (.p12) y rango CAFC.|
| Ninguna operación del punto de venta se encuentra bloqueada.                                      |
+-------------------------------------------------------------------+-------------------------------+
| ESTADO DE LA CONTINGENCIA                                         | MONITOR DE COLA LOCAL         |
|                                                                   |                               |
| Evento Significativo: Corte de Servicio de Internet (Código: 2)   | Facturas emitidas offline: 18 |
| Inicio del Evento:    08/10/2026 16:45:10                         | Total acumulado: Bs 1,420.50  |
| Rango CAFC en uso:    CAFC-2026-00918 (Facturas #121 a #138)      | XML firmados localmente:   18 |
| Tiempo Transcurrido:  1 hora 45 minutos                           | Paquetes comprimidos:       1 |
+-------------------------------------------------------------------+-------------------------------+
| RECONEXIÓN Y REGULARIZACIÓN FISCAL                                                                |
|                                                                                                   |
| Estado de Conexión a Internet: [  RESTABLECIDA (PING OK 45ms)  ]                                  |
|                                                                                                   |
| PASO 1: [  [OK] REGISTRAR CIERRE DE EVENTO SIGNIFICATIVO EN SIAT  ]                               |
| PASO 2: [  [SINCRONIZAR AHORA] TRANSMITIR PAQUETE DE FACTURAS COMPRIMIDO (recepcionPaquete)  ]    |
|                                                                                                   |
| Progreso de Envío: [=====================================>    ] 85% (15/18 validadas)             |
+---------------------------------------------------------------------------------------------------+
```
