import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { CSSProperties } from 'react';

const COLORS = {
  primary: '#FF6B35',
  primaryDark: '#E55A2B',
  secondary: '#2D3436',
  background: '#FFFFFF',
  backgroundDark: '#1A1A1A',
  card: '#F8F9FA',
  text: '#2D3436',
  textLight: '#636E72',
  border: '#DFE6E9',
};

interface LegalPagesProps {
  page: 'support' | 'privacy' | 'terms';
  onBack: () => void;
  theme: { background: string; text: string; textLight: string; border: string; card: string };
}

export const LegalPages: React.FC<LegalPagesProps> = ({ page, onBack, theme }) => {
  const styles: { [key: string]: CSSProperties } = {
    container: {
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      backgroundColor: theme.background,
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      padding: '16px',
      borderBottom: `1px solid ${theme.border}`,
      gap: 12,
    },
    backButton: {
      backgroundColor: 'transparent',
      border: 'none',
      cursor: 'pointer',
      padding: 8,
      display: 'flex',
      alignItems: 'center',
    },
    title: {
      fontSize: 20,
      fontWeight: 700,
      color: theme.text,
      flex: 1,
    },
    content: {
      flex: 1,
      overflow: 'auto',
      padding: 20,
    },
    section: {
      marginBottom: 24,
    },
    heading: {
      fontSize: 18,
      fontWeight: 700,
      color: theme.text,
      marginBottom: 12,
    },
    subheading: {
      fontSize: 16,
      fontWeight: 600,
      color: theme.text,
      marginTop: 16,
      marginBottom: 8,
    },
    paragraph: {
      fontSize: 14,
      lineHeight: 1.6,
      color: theme.textLight,
      marginBottom: 12,
    },
    link: {
      color: COLORS.primary,
      textDecoration: 'none',
      cursor: 'pointer',
    },
  };

  const getPageContent = () => {
    if (page === 'support') {
      return (
        <div style={styles.content}>
          <div style={styles.section}>
            <h2 style={styles.heading}>Support & Help</h2>
            <p style={styles.paragraph}>
              Have questions or issues with MindToss? We're here to help!
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>Frequently Asked Questions</h3>

            <h4 style={{ ...styles.subheading, fontSize: 14 }}>How do I capture a thought?</h4>
            <p style={styles.paragraph}>
              Open the app and choose your preferred capture method: Note (text), Voice, or Photo. Fill in your thought and tap TOSS to send it to your email.
            </p>

            <h4 style={{ ...styles.subheading, fontSize: 14 }}>How do I add email addresses?</h4>
            <p style={styles.paragraph}>
              Go to Settings, scroll down and tap "Email Addresses". Add as many email addresses as you'd like. Your thoughts can be sent to any of them.
            </p>

            <h4 style={{ ...styles.subheading, fontSize: 14 }}>Can I record voice memos?</h4>
            <p style={styles.paragraph}>
              Yes! Tap the Voice tab, press the microphone button to start recording, and tap stop when done. Your voice memo will be attached to the email.
            </p>

            <h4 style={{ ...styles.subheading, fontSize: 14 }}>Can I send photos from my phone?</h4>
            <p style={styles.paragraph}>
              Yes! Tap the Photo tab, choose "Take Photo" or "Library" to select an existing photo. The photo will be attached to your email.
            </p>

            <h4 style={{ ...styles.subheading, fontSize: 14 }}>Why isn't my email arriving?</h4>
            <p style={styles.paragraph}>
              Check your spam/junk folder first. Make sure you've entered the correct email address in Settings. If problems persist, contact support@mindtoss.space
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>Contact Us</h3>
            <p style={styles.paragraph}>
              Email: <a style={styles.link} href="mailto:support@mindtoss.space">support@mindtoss.space</a>
            </p>
            <p style={styles.paragraph}>
              We typically respond within 24 hours.
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>Technical Issues</h3>
            <p style={styles.paragraph}>
              If you experience technical issues, please try:
            </p>
            <ul style={{ paddingLeft: 20, color: theme.textLight, fontSize: 14 }}>
              <li style={{ marginBottom: 8 }}>Force closing and reopening the app</li>
              <li style={{ marginBottom: 8 }}>Clearing the app cache</li>
              <li style={{ marginBottom: 8 }}>Ensuring you have the latest app version</li>
              <li style={{ marginBottom: 8 }}>Checking your internet connection</li>
            </ul>
            <p style={styles.paragraph} className="mt-4">
              If issues persist, please contact support with details about what you experienced.
            </p>
          </div>
        </div>
      );
    }

    if (page === 'privacy') {
      return (
        <div style={styles.content}>
          <div style={styles.section}>
            <h2 style={styles.heading}>Privacy Policy</h2>
            <p style={styles.paragraph}>
              Last updated: January 2026
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>1. Introduction</h3>
            <p style={styles.paragraph}>
              MindToss ("we", "us", or "our") operates the MindToss mobile application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>2. Information Collection and Use</h3>
            <p style={styles.paragraph}>
              We collect several different types of information for various purposes to provide and improve our Service to you.
            </p>

            <h4 style={{ ...styles.subheading, fontSize: 14 }}>Types of Data Collected:</h4>
            <ul style={{ paddingLeft: 20, color: theme.textLight, fontSize: 14 }}>
              <li style={{ marginBottom: 8 }}>Personal Data: Email address, name (optional)</li>
              <li style={{ marginBottom: 8 }}>Usage Data: App interactions, feature usage, error logs</li>
              <li style={{ marginBottom: 8 }}>Device Data: Device type, OS version, unique identifiers</li>
              <li style={{ marginBottom: 8 }}>Content Data: Notes, voice memos, and photos you create</li>
            </ul>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>3. Use of Data</h3>
            <p style={styles.paragraph}>
              MindToss uses the collected data for various purposes:
            </p>
            <ul style={{ paddingLeft: 20, color: theme.textLight, fontSize: 14 }}>
              <li style={{ marginBottom: 8 }}>To provide and maintain our Service</li>
              <li style={{ marginBottom: 8 }}>To notify you about changes to our Service</li>
              <li style={{ marginBottom: 8 }}>To allow you to participate in interactive features</li>
              <li style={{ marginBottom: 8 }}>To provide customer support</li>
              <li style={{ marginBottom: 8 }}>To gather analysis or valuable information so we can improve our Service</li>
            </ul>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>4. Security of Data</h3>
            <p style={styles.paragraph}>
              The security of your data is important to us but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>5. Changes to This Privacy Policy</h3>
            <p style={styles.paragraph}>
              We may update our Privacy Policy from time to time. We will notify you of any changes by updating the "Last updated" date of this Privacy Policy.
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>6. Contact Us</h3>
            <p style={styles.paragraph}>
              If you have any questions about this Privacy Policy, please contact us at:
            </p>
            <p style={styles.paragraph}>
              Email: <a style={styles.link} href="mailto:privacy@mindtoss.space">privacy@mindtoss.space</a>
            </p>
          </div>
        </div>
      );
    }

    if (page === 'terms') {
      return (
        <div style={styles.content}>
          <div style={styles.section}>
            <h2 style={styles.heading}>Terms of Service</h2>
            <p style={styles.paragraph}>
              Last updated: January 2026
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>1. Agreement to Terms</h3>
            <p style={styles.paragraph}>
              By downloading, installing, and using the MindToss application, you agree to be bound by these Terms of Service. If you do not agree to abide by the above, please do not use this Service.
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>2. Use License</h3>
            <p style={styles.paragraph}>
              Permission is granted to temporarily download one copy of the materials (including information and software) on MindToss for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul style={{ paddingLeft: 20, color: theme.textLight, fontSize: 14 }}>
              <li style={{ marginBottom: 8 }}>Modifying or copying the materials</li>
              <li style={{ marginBottom: 8 }}>Using the materials for any commercial purpose or for any public display</li>
              <li style={{ marginBottom: 8 }}>Attempting to decompile or reverse engineer any software contained on MindToss</li>
              <li style={{ marginBottom: 8 }}>Transmitting or mailing any content to anyone or storing content on any network</li>
              <li style={{ marginBottom: 8 }}>Attempting to gain unauthorized access to any portion or feature of the Service</li>
            </ul>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>3. Disclaimer</h3>
            <p style={styles.paragraph}>
              The materials on MindToss are provided on an 'as is' basis. MindToss makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>4. Limitations</h3>
            <p style={styles.paragraph}>
              In no event shall MindToss or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on MindToss, even if we or an authorized representative has been notified orally or in writing of the possibility of such damage.
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>5. Accuracy of Materials</h3>
            <p style={styles.paragraph}>
              The materials appearing on MindToss could include technical, typographical, or photographic errors. MindToss does not warrant that any of the materials on the Service are accurate, complete, or current. We may make changes to the materials contained on the Service at any time without notice.
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>6. Links</h3>
            <p style={styles.paragraph}>
              MindToss has not reviewed all of the sites linked to its website and is not responsible for the contents of any such linked site. The inclusion of any link does not imply endorsement by MindToss of the site. Use of any such linked website is at the user's own risk.
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>7. Modifications</h3>
            <p style={styles.paragraph}>
              MindToss may revise these Terms of Service for the Service at any time without notice. By using the Service, you are agreeing to be bound by the then current version of these Terms of Service.
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>8. Governing Law</h3>
            <p style={styles.paragraph}>
              These Terms of Service and any separate agreements we provide to clarify the Service are governed by and construed in accordance with the laws of the jurisdiction in which MindToss operates.
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.subheading}>9. Contact Us</h3>
            <p style={styles.paragraph}>
              If you have any questions about these Terms of Service, please contact us at:
            </p>
            <p style={styles.paragraph}>
              Email: <a style={styles.link} href="mailto:legal@mindtoss.space">legal@mindtoss.space</a>
            </p>
          </div>
        </div>
      );
    }
  };

  const getPageTitle = () => {
    switch (page) {
      case 'support': return 'Support & Help';
      case 'privacy': return 'Privacy Policy';
      case 'terms': return 'Terms of Service';
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backButton} onClick={onBack}>
          <ArrowLeft size={24} color={theme.text} />
        </button>
        <h1 style={styles.title}>{getPageTitle()}</h1>
      </div>
      {getPageContent()}
    </div>
  );
};
