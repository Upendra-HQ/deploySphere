import nodemailer from 'nodemailer';
import { PrismaClient } from '@prisma/client';
import { FRONTEND_URL } from '../config/appConfig';

const prisma = new PrismaClient();
const EMAIL_SERVICE = process.env.EMAIL_SERVICE || 'mock';

const createTransporter = () => {
  if (EMAIL_SERVICE === 'smtp') {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
      port: parseInt(process.env.SMTP_PORT || '2525', 10),
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  return null;
};

export const sendEmail = async (to: string, subject: string, html: string): Promise<boolean> => {
  const transporter = createTransporter();

  if (transporter) {
    try {
      await transporter.sendMail({
        from: '"DeploySphere System" <noreply@deploysphere.local>',
        to,
        subject,
        html,
      });
      console.log(`[EMAIL SERVICE] Email sent successfully to ${to}.`);
      return true;
    } catch (err: any) {
      console.error('[EMAIL SERVICE] Failed to send real email:', err.message);
    }
  }

  console.log('\n=================== DEPLOYMENT EMAIL SIMULATION ===================');
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('Content:');
  console.log(html.replace(/<[^>]*>/g, '').trim());
  console.log('===================================================================\n');
  return true;
};

export const notifyDeploymentStatus = async (
  projectId: string,
  deploymentId: string,
  status: 'SUCCESS' | 'FAILED' | 'BUILDING'
): Promise<void> => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { user: true },
    });

    if (!project || !project.user) {
      console.error(`[NOTIFICATION SERVICE] Project or user not found for ID: ${projectId}`);
      return;
    }

    const userEmail = project.user.email;
    const projectName = project.name;
    const deploymentUrl = `${FRONTEND_URL}/deployments/${deploymentId}`;

    let subject = '';
    let body = '';

    switch (status) {
      case 'BUILDING':
        subject = `[DeploySphere] Build Started: ${projectName}`;
        body = `<h3>Deployment Started</h3>
                <p>DeploySphere has started a new build execution pipeline for your project <strong>${projectName}</strong> (branch: <em>${project.branch}</em>).</p>
                <p>You can monitor the compilation logs in real time here: <a href="${deploymentUrl}">${deploymentUrl}</a></p>`;
        break;
      case 'SUCCESS':
        subject = `[DeploySphere] Build Succeeded: ${projectName}`;
        body = `<h3>Deployment Succeeded</h3>
                <p>Your project <strong>${projectName}</strong> (branch: <em>${project.branch}</em>) was successfully compiled and deployed.</p>
                <p>The application runtime container is now active.</p>
                <p>View detailed logs and proxy paths here: <a href="${deploymentUrl}">${deploymentUrl}</a></p>`;
        break;
      case 'FAILED':
        subject = `[DeploySphere] Build Failed: ${projectName}`;
        body = `<h3>Deployment Failed</h3>
                <p>The compilation pipeline for project <strong>${projectName}</strong> (branch: <em>${project.branch}</em>) failed.</p>
                <p>Review the stdout/stderr highlights in the logs terminal: <a href="${deploymentUrl}">${deploymentUrl}</a></p>`;
        break;
    }

    await sendEmail(userEmail, subject, body);
  } catch (err: any) {
    console.error('[NOTIFICATION SERVICE] Error triggering notification:', err.message);
  }
};
