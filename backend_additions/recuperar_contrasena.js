/* =============================================================================
   RECUPERAR CONTRASEÑA CON BREVO + SUPABASE
   ─────────────────────────────────────────
   PASO 1 — Instalar dependencias (una sola vez):
     npm install @getbrevo/brevo jsonwebtoken bcryptjs

   PASO 2 — Agregar al .env:
     BREVO_API_KEY=xkeysib-...tu-api-key-de-brevo...
     JWT_SECRET=un_secreto_largo_y_seguro
     FRONTEND_URL=http://localhost:4000
     EMAIL_FROM=noreply@dulcehogar.com
     EMAIL_FROM_NAME=Dulce Hogar

   PASO 3 — En tu archivo principal de rutas (router.js o index.js),
   AGREGA estas dos líneas donde tienes el resto de rutas /auth o /usuario:

     const authRecuperar = require('./backend_additions/recuperar_contrasena');
     router.use('/auth', authRecuperar);

   Eso monta:
     POST /api/auth/recuperar       ← Flutter llama esto
     POST /api/auth/reset-password  ← página web/app llama esto tras el enlace
============================================================================= */

const express       = require('express');
const router        = express.Router();
const jwt           = require('jsonwebtoken');
const bcrypt        = require('bcryptjs');
const SibApiV3Sdk   = require('@getbrevo/brevo');

// ── Cliente Brevo ─────────────────────────────────────────────────────────────
const brevoClient = SibApiV3Sdk.ApiClient.instance;
brevoClient.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

// ── Supabase (usa el mismo cliente que ya tienes en tu proyecto) ──────────────
// Ajusta la ruta de importación según tu estructura de carpetas:
//   Si tu supabase client está en ./supabaseClient.js   → require('./supabaseClient')
//   Si está en ../supabaseClient.js                      → require('../supabaseClient')
//   Si está en ./config/supabase.js                      → require('./config/supabase')
// ⚠️ Cambia la línea de abajo según corresponda:
const { supabase } = require('../supabaseClient'); // ← AJUSTA ESTA RUTA

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/auth/recuperar
   Body: { "email": "usuario@correo.com" }
   Responde siempre 200 para no revelar si el email existe
───────────────────────────────────────────────────────────────────────────── */
router.post('/recuperar', async (req, res) => {
  const email = (req.body.email || '').toLowerCase().trim();

  if (!email || !email.includes('@')) {
    return res.status(400).json({ message: 'Correo inválido' });
  }

  try {
    // 1. Buscar usuario en Supabase
    const { data: usuario, error: dbError } = await supabase
      .from('usuario')
      .select('cedula, nombre, email')
      .eq('email', email)
      .maybeSingle();

    if (dbError) {
      console.error('[recuperar] Supabase error:', dbError.message);
      return res.status(500).json({ message: 'Error interno del servidor' });
    }

    // Respondemos 200 siempre aunque no exista el correo
    if (!usuario) {
      return res.status(200).json({
        message: 'Si el correo está registrado, recibirás el enlace en breve',
      });
    }

    // 2. Generar token JWT (30 min)
    const token = jwt.sign(
      { cedula: usuario.cedula, email: usuario.email, tipo: 'recuperacion' },
      process.env.JWT_SECRET,
      { expiresIn: '30m' }
    );

    // 3. Enlace de recuperación
    //    Para app móvil usa deep link: dulcehogar://reset-password?token=TOKEN
    //    Para web usa:
    const enlace = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    // 4. Enviar correo con Brevo
    const mail = new SibApiV3Sdk.SendSmtpEmail();
    mail.sender = {
      email: process.env.EMAIL_FROM      || 'noreply@dulcehogar.com',
      name:  process.env.EMAIL_FROM_NAME || 'Dulce Hogar',
    };
    mail.to      = [{ email: usuario.email, name: usuario.nombre || 'Cliente' }];
    mail.subject = '🔑 Recupera tu contraseña — Dulce Hogar';
    mail.htmlContent = _htmlCorreo(usuario.nombre || 'Cliente', usuario.email, enlace);
    mail.textContent =
      `Hola ${usuario.nombre || 'cliente'},\n\n` +
      `Para restablecer tu contraseña entra aquí (válido 30 min):\n${enlace}\n\n` +
      `Si no solicitaste este cambio, ignora este correo.\n— Dulce Hogar`;

    await emailApi.sendTransacEmail(mail);
    console.log(`[recuperar] Correo enviado a ${usuario.email}`);

    return res.status(200).json({
      message: 'Si el correo está registrado, recibirás el enlace en breve',
    });

  } catch (err) {
    console.error('[recuperar] Error:', err?.response?.text || err.message);
    return res.status(500).json({ message: 'Error interno del servidor' });
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   POST /api/auth/reset-password
   Body: { "token": "...", "nuevaContrasena": "..." }
───────────────────────────────────────────────────────────────────────────── */
router.post('/reset-password', async (req, res) => {
  const { token, nuevaContrasena } = req.body;

  if (!token || !nuevaContrasena) {
    return res.status(400).json({ message: 'Token y nueva contraseña son requeridos' });
  }
  if (nuevaContrasena.length < 6) {
    return res.status(400).json({ message: 'La contraseña debe tener mínimo 6 caracteres' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (payload.tipo !== 'recuperacion') {
      return res.status(400).json({ message: 'Token inválido' });
    }

    const hash = await bcrypt.hash(nuevaContrasena, 10);

    const { error } = await supabase
      .from('usuario')
      .update({ contrasena: hash })
      .eq('cedula', payload.cedula);

    if (error) {
      console.error('[reset-password] Supabase error:', error.message);
      return res.status(500).json({ message: 'Error al actualizar la contraseña' });
    }

    return res.status(200).json({ message: 'Contraseña actualizada correctamente' });

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'El enlace expiró. Solicita uno nuevo' });
    }
    return res.status(400).json({ message: 'Token inválido o malformado' });
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   HTML del correo
───────────────────────────────────────────────────────────────────────────── */
function _htmlCorreo(nombre, email, enlace) {
  const year = new Date().getFullYear();
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Recupera tu contraseña</title></head>
<body style="margin:0;padding:0;background:#F5F0E8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F0E8;padding:32px 0;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0"
           style="background:#fff;border-radius:20px;box-shadow:0 4px 24px rgba(91,138,110,.12);overflow:hidden;">
      <!-- Header -->
      <tr><td style="background:#5B8A6E;padding:28px 32px;text-align:center;">
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;">🏠 Dulce Hogar</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,.85);font-size:13px;">
          Tu tienda de electrodomésticos de confianza</p>
      </td></tr>
      <!-- Body -->
      <tr><td style="padding:36px 32px 28px;">
        <h2 style="margin:0 0 8px;font-size:20px;color:#2C3E2D;font-weight:700;">
          Recupera tu contraseña</h2>
        <p style="margin:0 0 20px;font-size:14px;color:#6B7C6E;line-height:1.6;">
          Hola <strong style="color:#2C3E2D;">${nombre}</strong>,<br/>
          recibimos una solicitud para restablecer la contraseña de tu cuenta
          asociada a <strong>${email}</strong>.
        </p>
        <!-- CTA -->
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr><td align="center" style="padding:8px 0 24px;">
            <a href="${enlace}"
               style="display:inline-block;background:#5B8A6E;color:#fff;
                      text-decoration:none;font-size:15px;font-weight:700;
                      padding:14px 36px;border-radius:12px;">
              Restablecer contraseña
            </a>
          </td></tr>
        </table>
        <!-- Aviso -->
        <div style="background:#FFF8E8;border:1px solid #E8C47A;border-radius:10px;
                    padding:12px 16px;margin-bottom:20px;">
          <p style="margin:0;font-size:12px;color:#BF9A52;font-weight:600;">
            ⏱ Este enlace expira en <strong>30 minutos</strong>.
          </p>
        </div>
        <!-- Enlace alternativo -->
        <p style="margin:0 0 6px;font-size:12px;color:#6B7C6E;">
          Si el botón no funciona, copia este enlace en tu navegador:</p>
        <p style="margin:0 0 20px;font-size:11px;color:#5B8A6E;word-break:break-all;">
          ${enlace}</p>
        <hr style="border:none;border-top:1px solid #EEE8DC;margin:0 0 20px;"/>
        <p style="margin:0;font-size:12px;color:#ADB8A0;line-height:1.5;">
          Si <strong>no solicitaste</strong> este cambio, ignora este correo.
          Tu contraseña seguirá siendo la misma.</p>
      </td></tr>
      <!-- Footer -->
      <tr><td style="background:#F5F0E8;padding:16px 32px;text-align:center;">
        <p style="margin:0;font-size:11px;color:#ADB8A0;">
          © ${year} Dulce Hogar · Todos los derechos reservados</p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

module.exports = router;
