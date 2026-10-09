# Pharma ERP — API Architecture & System Diagrams

Este documento describe la arquitectura técnica, diseño modular, flujos de secuencia y modelo entidad-relación del backend de **Pharma ERP** (`apps/api`), construido sobre NestJS 11, Prisma 7, PostgreSQL 17 (con Row-Level Security), autenticación JWT/RBAC, sincronización offline-first con UUIDv7 y facturación electrónica (SIN SIAT v2).

---

## 1. Diagrama de Contexto del Sistema (C4 - Nivel 1 & 2)

El siguiente diagrama ilustra la interacción entre los clientes de la plataforma (Web, Desktop Tauri, Mobile Expo), el API Gateway/Servicio NestJS, la base de datos PostgreSQL y los servicios externos (Impuestos Nacionales SIAT, Pasarelas de Pago Bancarias, Correo Transaccional).

```mermaid
flowchart TB
    subgraph Clients["Clientes Frontend & Dispositivos"]
        WEB["Apps Web (React 19 / Vite)\n- Backoffice Administrativo\n- Reportes Gerenciales\n- POS Web"]
        DESKTOP["Apps Desktop (Tauri 2 + Rust)\n- Terminales de Caja Fija\n- Control Periféricos (ESC/POS, Gaveta, Balanza)\n- Bóveda Local Certificado .p12"]
        MOBILE["Apps Mobile (React Native / Expo)\n- Inventario Móvil en Bodega\n- POS Portátil Offline\n- Escaneo de Barras con Cámara"]
    end

    subgraph BackendGateway["Infraestructura Backend (apps/api)"]
        API["NestJS 11 Application Server\n- REST API (Zod Validation)\n- Multi-Tenant Middleware / Guard\n- RBAC Permission Enforcement\n- Sync & Outbox Delta Processor\n- XML-DSig / Fiscal Engine"]
        CACHE["Memory / Redis Cache\n- Daily CUFD & Token Cache\n- Rate Limiting\n- Active Sessions"]
    end

    subgraph DataTier["Capa de Datos & Persistencia"]
        DB[(PostgreSQL 17 Database\n- Strict Row-Level Security (RLS)\n- UUIDv7 Primary Keys\n- Append-Only Stock Ledger\n- 37 Tablas Relacionales)]
    end

    subgraph ExternalServices["Servicios Externos e Integraciones"]
        SIAT["SIN Bolivia SIAT v2\n- Web Services SOAP\n- Validación CUIS / CUFD\n- Recepción Facturas & Paquetes"]
        BANK["Pasarela Bancaria / QR Simple\n- REST API Firmado\n- Notificaciones Webhook"]
        SMTP["Resend / SMTP\n- Envío de Facturas y Notificaciones"]
    end

    WEB -->|"HTTPS / REST (JWT)"| API
    DESKTOP -->|"HTTPS / REST (JWT) + Sync"| API
    MOBILE -->|"HTTPS / REST (JWT) + Delta Sync"| API

    API -->|"Prisma 7 (Driver Adapter)"| DB
    API <--> CACHE
    API -->|"SOAP / XML-DSig"| SIAT
    API -->|"REST Firmado"| BANK
    API -->|"HTTPS"| SMTP
```

---

## 2. Arquitectura Interna del API (NestJS Modular Clean Architecture)

El backend sigue una arquitectura modular en capas con separación estricta de responsabilidades:

```mermaid
flowchart TD
    subgraph RequestPipeline["Tubería de Solicitud (HTTP Request Pipeline)"]
        REQ[Cliente Request] --> CORS[CORS & Helmet Middleware]
        CORS --> TENANT[TenantIdentificationMiddleware\n(Header / Subdominio)]
        TENANT --> AUTH_G[JwtAuthGuard\n(@Public bypass)]
        AUTH_G --> RBAC_G[PermissionsGuard\n(@RequirePermissions)]
        RBAC_G --> PIPE[ZodValidationPipe\n(Schema Validation DTO)]
    end

    subgraph ModulesLayer["Módulos de Dominio (apps/api/src/modules)"]
        AUTH_M["AuthModule\n- Registro de Tenant\n- Login JWT / Google\n- Refresh Tokens"]
        PROD_M["CatalogModule\n- Productos & Barcodes\n- Precios & Historial\n- Categorías Controladas"]
        STOCK_M["InventoryModule\n- Lotes & Vencimiento (FEFO)\n- Ledger de Movimientos\n- Transferencias & Ajustes"]
        POS_M["SalesModule\n- Venta Mostrador (UUIDv7)\n- Fraccionamiento (Cajas/Unidades)\n- Recetas Médicas"]
        CASH_M["CashModule\n- Apertura / Cierre de Turno\n- Arqueo de Caja\n- Movimientos de Efectivo"]
        BILL_M["BillingModule\n- FiscalAdapter Interface\n- SinAdapter (SIAT Bolivia)\n- Gestor de Contingencia"]
        SYNC_M["SyncModule\n- Delta Sync (since timestamp)\n- Outbox Batch Ingestion\n- Resolución de Conflictos"]
    end

    subgraph IntegrationsLayer["Servicios de Integración (apps/api/src/modules/integrations)"]
        SOAP_S["SoapClientService\n(WSDL SIAT)"]
        SIG_S["SignatureService\n(XML-DSig, RSA-SHA256, c14n)"]
        BANK_S["BankQrService\n(Integración Pago QR)"]
        MAIL_S["MailService\n(Resend Transaccional)"]
    end

    subgraph PersistenceLayer["Persistencia & Acceso a Datos"]
        PRISMA["PrismaService\n(Client PostgreSQL con RLS Context)"]
        PG_RLS[PostgreSQL RLS\nSET LOCAL app.current_tenant_id]
    end

    PIPE --> ModulesLayer
    ModulesLayer --> IntegrationsLayer
    ModulesLayer --> PRISMA
    PRISMA --> PG_RLS
```

---

## 3. Flujo de Autenticación, Resolución de Tenant y Autorización RBAC

```mermaid
sequenceDiagram
    autonumber
    actor User as Usuario / Terminal
    participant Client as Web / Desktop / Mobile
    participant Guard as JwtAuthGuard & PermissionsGuard
    participant AuthService as AuthService
    participant DB as PostgreSQL (Prisma)

    User->>Client: Ingresa credenciales (email, password, tenantSlug)
    Client->>AuthService: POST /api/auth/login { email, password, tenantSlug }
    AuthService->>DB: Busca Tenant por slug y Usuario por email
    DB-->>AuthService: Tenant + User (con Roles y Permisos)
    AuthService->>AuthService: Verifica Password (Argon2 / Bcrypt)
    AuthService-->>Client: 200 OK { accessToken, refreshToken, user: { id, permissions, tenantId } }
    
    Note over Client: Almacena JWT en memoria/storage seguro

    User->>Client: Solicita dispensar medicamento controlado
    Client->>Guard: POST /api/sales (Header: Authorization Bearer <token>)
    Guard->>Guard: Decodifica JWT y valida firma
    Guard->>Guard: Extrae tenantId y permissions
    Guard->>Guard: Evalúa @RequirePermissions('sales.create', 'prescriptions.verify')
    alt Permiso Denegado
        Guard-->>Client: 403 Forbidden { message: 'Insufficient permissions' }
    else Permiso Otorgado
        Guard->>DB: SET LOCAL app.current_tenant_id = tenantId
        Guard->>AuthService: Ejecuta Lógica de Venta
        AuthService-->>Client: 201 Created { saleId, ... }
    end
```

---

## 4. Flujo de Venta en Punto de Venta (POS) y Asignación FEFO

La farmacia opera bajo la regla **FEFO** (*First-Expired, First-Out*), priorizando los lotes más próximos a vencer en estado `ACTIVE`. Soporta venta fraccionada (caja entera vs. comprimidos sueltos).

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Cajero / Farmacéutico
    participant POS as Terminal POS (Web / Desktop)
    participant SalesAPI as SalesService (API)
    participant StockService as InventoryService (FEFO)
    participant Ledger as StockMovement (Ledger)
    participant Fiscal as BillingService (SIAT)

    Cashier->>POS: Escanea código de barras (ej. Amoxicilina 500mg)
    POS->>POS: Genera ID de venta con UUIDv7 en el cliente
    Cashier->>POS: Selecciona cantidad (ej. 5 tabletas sueltas / SaleUnit.UNIT)
    
    opt Medicamento Controlado (Psicotrópico / Estupefaciente)
        POS->>Cashier: Solicita datos de receta médica
        Cashier->>POS: Ingresa Matrícula Médica, Médico, CI Paciente
    end

    Cashier->>POS: Totaliza y procesa pago (Efectivo / QR / Tarjeta)
    POS->>SalesAPI: POST /api/sales { id: uuid_v7, items: [...], payments: [...], prescription: {...} }
    
    critical Transacción Atómica de Venta
        SalesAPI->>StockService: Asignar lotes mediante algoritmo FEFO
        StockService->>StockService: Busca lotes ACTIVE con stock > 0 ordenados por expirationDate ASC
        StockService->>StockService: Descuenta baseQuantity (tabletas)
        SalesAPI->>Ledger: Inserta StockMovement (type: SALE, quantity: -baseQuantity, signed)
        SalesAPI->>SalesAPI: Crea Sale, SaleItem, SalePayment y Prescription
        SalesAPI->>Fiscal: Genera Factura / CUF
    end

    Fiscal-->>SalesAPI: Factura Firmada (Digital XML / CUF)
    SalesAPI-->>POS: 201 Created { sale, invoice: { cuf, invoiceNumber, qrCode } }
    POS->>POS: Emite ticket fiscal a impresora térmica (ESC/POS) y abre gaveta
```

---

## 5. Arquitectura Offline-First y Motor de Sincronización Delta

Las sucursales rurales o de baja conectividad deben continuar operando al 100% sin conexión a internet.

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Cajero
    participant Device as Dispositivo Local (SQLite / Outbox)
    participant Worker as SyncBackgroundWorker
    participant SyncAPI as SyncController (API NestJS)
    participant ServerDB as PostgreSQL Cloud

    Note over Device: Pérdida total de conexión a Internet (Modo Offline)
    Cashier->>Device: Realiza 10 ventas y emite facturas con CAFC
    Device->>Device: Genera UUIDv7 para cada venta/factura
    Device->>Device: Guarda en SQLite local (Transacción inmediata: 0ms latencia)
    Device->>Device: Inserta en tabla local OUTBOX { status: 'PENDING', payload: JSON }

    Note over Worker: Conexión a Internet Restablecida
    Worker->>SyncAPI: GET /api/sync/delta?since=2026-10-08T18:00:00Z
    SyncAPI->>ServerDB: Consulta cambios maestros (precios, productos modificados)
    ServerDB-->>SyncAPI: Delta de registros actualizados
    SyncAPI-->>Worker: 200 OK { delta: { products: [...], prices: [...] } }
    Worker->>Device: Aplica delta a SQLite local

    Worker->>Device: Lee registros PENDING del Outbox (Lotes de 5-10 items)
    Worker->>SyncAPI: POST /api/sync/outbox/push { mutations: [ ... ] }
    SyncAPI->>ServerDB: Ingesta idempotente (Upsert basado en UUIDv7)
    ServerDB-->>SyncAPI: Éxito (registros sincronizados sin duplicados)
    SyncAPI-->>Worker: 200 OK { syncedIds: [ ... ] }
    Worker->>Device: Actualiza Outbox a status: 'SYNCED'
```

---

## 6. Motor Fiscal SIAT Bolivia: Modo Online vs. Modo Contingencia

```mermaid
sequenceDiagram
    autonumber
    participant POS as Punto de Venta (Local)
    participant Signer as XML-DSig Signer (RSA SHA-256 c14n)
    participant SIAT as Impuestos Nacionales (SIAT SOAP)
    participant Cloud as Backend Central

    rect rgb(235, 248, 255)
        Note over POS, SIAT: ESCENARIO 1: FACTURACIÓN ONLINE
        POS->>POS: Inicia jornada: valida CUIS y obtiene CUFD diario (vigencia 24h)
        POS->>POS: Realiza venta y calcula Código CUF con algoritmo SIAT
        POS->>Signer: Firma documento XML con certificado digital (.p12)
        Signer-->>POS: XML Firmado Digitalmente
        POS->>SIAT: SOAP: recepcionFacturaElectronica(xmlFirmado, cufd)
        SIAT-->>POS: Respuesta: ESTADO VALIDADA
        POS->>POS: Imprime Factura con QR
    end

    rect rgb(254, 243, 199)
        Note over POS, SIAT: ESCENARIO 2: MODO CONTINGENCIA (CORTE DE INTERNET)
        POS->>POS: Detecta caída de red (Timeout SIAT > 3s)
        POS->>POS: Activa CAFC (Código de Autorización de Facturas en Contingencia)
        POS->>POS: Emite factura local usando CUFD cacheado y rango CAFC
        POS->>Signer: Firma local XML-DSig con certificado digital local
        POS->>POS: Imprime Factura "EMISIÓN FUERA DE LÍNEA"
        POS->>POS: Encola XML en directorio de contingencia local
    end

    rect rgb(236, 253, 245)
        Note over POS, Cloud: ESCENARIO 3: REGISTRO DE EVENTO SIGNIFICATIVO Y SINCRONIZACIÓN DE PAQUETE
        POS->>SIAT: Internet restaurado: SOAP registroEventoSignificativo (Corte de Conexión)
        SIAT-->>POS: Evento Registrado (ID Evento)
        POS->>POS: Empaqueta y comprime (TAR.GZ) las facturas emitidas offline
        POS->>SIAT: SOAP recepcionPaqueteFacturas(tarGzBase64, idEvento, cafc)
        SIAT-->>POS: Código de Recepción de Paquete
        POS->>SIAT: SOAP validacionRecepcionPaqueteFacturas(codigoRecepcion)
        SIAT-->>POS: PAQUETE VALIDADO
    end
```

---

## 7. Diagrama Entidad-Relación Detallado (ERD de Dominio)

```mermaid
erDiagram
    TENANT ||--o{ BRANCH : "posee"
    TENANT ||--o{ USER : "emplea"
    TENANT ||--o{ CUSTOMER : "registra"
    TENANT ||--o{ PRODUCT : "cataloga"
    TENANT ||--o{ SUPPLIER : "compra_a"

    BRANCH ||--o{ POS_STATION : "alberga"
    BRANCH ||--o{ STOCK : "mantiene"
    BRANCH ||--o{ STOCK_MOVEMENT : "registra"
    POS_STATION ||--o{ CASH_SHIFT : "opera"
    POS_STATION ||--o{ SIAT_CUIS : "solicita"
    SIAT_CUIS ||--o{ SIAT_CUFD : "renueva_diario"
    POS_STATION ||--o{ SIAT_CAFC : "dispone_rango"

    CASH_SHIFT ||--o{ CASH_MOVEMENT : "transacciona"
    CASH_SHIFT ||--o{ SALE : "liquida"

    PRODUCT ||--o{ PRODUCT_BARCODE : "escaneable"
    PRODUCT ||--o{ PRODUCT_PRICE_HISTORY : "registra_precio"
    PRODUCT ||--o{ PRODUCT_BATCH : "compuesto_de"
    PRODUCT_BATCH ||--o{ STOCK : "cuantificado_en"
    PRODUCT_BATCH ||--o{ STOCK_MOVEMENT : "asociado_a"

    SUPPLIER ||--o{ PURCHASE : "suministra"
    PURCHASE ||--o{ PURCHASE_ITEM : "detalla"
    PRODUCT_BATCH ||--o{ PURCHASE_ITEM : "creado_por"

    CUSTOMER ||--o{ SALE : "adquiere"
    SALE ||--o{ SALE_ITEM : "incluye"
    SALE ||--o{ SALE_PAYMENT : "paga_con"
    SALE ||--o{ PRESCRIPTION : "respaldado_por"
    PRODUCT_BATCH ||--o{ SALE_ITEM : "descarga"
    PRESCRIPTION |o--o{ SALE_ITEM : "justifica"

    SALE ||--o{ INVOICE : "emite_fiscalmente"
    SIAT_CUFD ||--o{ INVOICE : "autoriza"
    SIAT_CAFC |o--o{ INVOICE : "asigna_rango"
    SIAT_EVENT ||--o{ INVOICE_PACKAGE : "agrupa"
    INVOICE_PACKAGE |o--o{ INVOICE : "contiene"

    SALE ||--o{ SALE_RETURN : "reversa"
    SALE_RETURN ||--o{ SALE_RETURN_ITEM : "devuelve"
    STOCK_TRANSFER ||--o{ STOCK_TRANSFER_ITEM : "mueve"
```

---

## 8. Catálogo Estructurado de Endpoints REST del API

| Método | Endpoint | Permiso Requerido | Descripción |
| :--- | :--- | :--- | :--- |
| **POST** | `/api/auth/register` | `@Public()` | Registro inicial de empresa tenant y usuario owner |
| **POST** | `/api/auth/login` | `@Public()` | Autenticación con email/contraseña y tenant |
| **POST** | `/api/auth/google` | `@Public()` | Autenticación mediante Google OAuth Identity Token |
| **GET** | `/api/auth/me` | Autenticado | Perfil de usuario, permisos activos y sucursales asignadas |
| **GET** | `/api/products` | `catalog.read` | Listado paginado de productos, códigos y precios |
| **POST** | `/api/products` | `catalog.write` | Creación de producto con metadata sanitaria y controlada |
| **GET** | `/api/inventory/batches` | `inventory.read` | Consulta de lotes FEFO con estado y fecha de vencimiento |
| **POST** | `/api/inventory/adjustments` | `inventory.write` | Ajuste manual de stock con motivo y firma de auditoría |
| **POST** | `/api/inventory/transfers` | `inventory.transfer` | Transferencia entre sucursales (`IN_TRANSIT`, `RECEIVED`) |
| **POST** | `/api/purchases` | `purchases.create` | Recepción de orden de compra y registro de nuevos lotes |
| **POST** | `/api/cash/shifts/open` | `cash.open` | Apertura de turno de caja con saldo inicial |
| **POST** | `/api/cash/shifts/close` | `cash.close` | Cierre de turno, arqueo ciego y cálculo de diferencias |
| **POST** | `/api/sales` | `sales.create` | Creación de venta, asignación FEFO y emisión fiscal |
| **POST** | `/api/sales/:id/cancel` | `sales.cancel` | Anulación de venta, reversa de inventario y baja fiscal |
| **POST** | `/api/sales/returns` | `sales.return` | Devolución parcial de productos y nota de crédito fiscal |
| **GET** | `/api/prescriptions` | `prescriptions.read` | Libro oficial de estupefacientes y psicotrópicos |
| **POST** | `/api/fiscal/invoices` | `fiscal.invoice` | Emisión y firma XML-DSig de factura electrónica SIAT |
| **POST** | `/api/fiscal/events` | `fiscal.event` | Declaración de evento significativo (contingencia) |
| **POST** | `/api/fiscal/packages` | `fiscal.package` | Envío de paquete masivo de facturas emitidas offline |
| **GET** | `/api/sync/delta` | `sync.read` | Consulta delta de registros modificados desde cursor de tiempo |
| **POST** | `/api/sync/outbox/push` | `sync.write` | Ingesta masiva e idempotente de mutaciones generadas offline |
