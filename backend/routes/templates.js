const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// Get available templates
router.get('/', auth, async (req, res) => {
  try {
    const templates = [
      {
        id: 'standard',
        name: 'Standard',
        description: 'Clean and professional template suitable for all business types',
        preview: '/templates/standard-preview.png',
        features: ['Company logo', 'Client details', 'Itemized billing', 'Tax calculations', 'Payment terms']
      },
      {
        id: 'modern',
        name: 'Modern',
        description: 'Contemporary design with bold typography and clean layout',
        preview: '/templates/modern-preview.png',
        features: ['Modern design', 'Color customization', 'Large header', 'Summary section']
      },
      {
        id: 'minimal',
        name: 'Minimal',
        description: 'Simple and elegant template focusing on essential information',
        preview: '/templates/minimal-preview.png',
        features: ['Minimal design', 'Essential details only', 'Clean typography', 'Space efficient']
      },
      {
        id: 'creative',
        name: 'Creative',
        description: 'Eye-catching design perfect for creative professionals',
        preview: '/templates/creative-preview.png',
        features: ['Creative layout', 'Custom colors', 'Unique styling', 'Brand focused']
      },
      {
        id: 'corporate',
        name: 'Corporate',
        description: 'Professional template ideal for large businesses and enterprises',
        preview: '/templates/corporate-preview.png',
        features: ['Corporate styling', 'Formal layout', 'Complete branding', 'Detailed sections']
      }
    ];

    res.json({ templates });
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get template by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const templates = {
      standard: {
        id: 'standard',
        name: 'Standard',
        html: `
          <div class="invoice-template standard">
            <header class="invoice-header">
              {{#if logo}}<img src="{{logo}}" alt="Logo" class="logo">{{/if}}
              <div class="company-info">
                <h1>{{businessName}}</h1>
                <div>{{businessAddress}}</div>
                <div>{{businessPhone}} | {{businessEmail}}</div>
              </div>
            </header>
            
            <div class="invoice-info">
              <div class="invoice-details">
                <h2>INVOICE</h2>
                <div>Invoice #: {{invoiceNumber}}</div>
                <div>Date: {{issueDate}}</div>
                <div>Due Date: {{dueDate}}</div>
              </div>
              
              <div class="client-info">
                <h3>Bill To:</h3>
                <div>{{clientName}}</div>
                {{#if clientCompany}}<div>{{clientCompany}}</div>{{/if}}
                <div>{{clientAddress}}</div>
                <div>{{clientEmail}}</div>
              </div>
            </div>
            
            <table class="items-table">
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {{#each items}}
                <tr>
                  <td>{{description}}</td>
                  <td>{{quantity}}</td>
                  <td>{{currency}}{{rate}}</td>
                  <td>{{currency}}{{amount}}</td>
                </tr>
                {{/each}}
              </tbody>
            </table>
            
            <div class="totals">
              <div class="total-row">
                <span>Subtotal:</span>
                <span>{{currency}}{{subtotal}}</span>
              </div>
              {{#if taxAmount}}
              <div class="total-row">
                <span>Tax:</span>
                <span>{{currency}}{{taxAmount}}</span>
              </div>
              {{/if}}
              {{#if discountAmount}}
              <div class="total-row">
                <span>Discount:</span>
                <span>-{{currency}}{{discountAmount}}</span>
              </div>
              {{/if}}
              <div class="total-row total">
                <span>Total:</span>
                <span>{{currency}}{{totalAmount}}</span>
              </div>
            </div>
            
            {{#if notes}}
            <div class="notes">
              <h4>Notes:</h4>
              <p>{{notes}}</p>
            </div>
            {{/if}}
            
            <div class="payment-terms">
              <p>Payment Terms: {{paymentTerms}}</p>
            </div>
          </div>
        `,
        css: `
          .invoice-template.standard {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            color: #333;
          }
          .invoice-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
            border-bottom: 2px solid #007bff;
            padding-bottom: 20px;
          }
          .logo { max-height: 60px; }
          .company-info { text-align: right; }
          .invoice-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          .items-table th, .items-table td {
            padding: 10px;
            text-align: left;
            border-bottom: 1px solid #ddd;
          }
          .items-table th {
            background-color: #f8f9fa;
            font-weight: bold;
          }
          .totals {
            text-align: right;
            margin-bottom: 20px;
          }
          .total-row {
            display: flex;
            justify-content: space-between;
            max-width: 300px;
            margin-left: auto;
            padding: 5px 0;
          }
          .total-row.total {
            font-weight: bold;
            font-size: 1.2em;
            border-top: 2px solid #007bff;
            padding-top: 10px;
          }
          .notes, .payment-terms {
            margin-top: 20px;
          }
        `
      },
      // Add other templates here...
    };

    const template = templates[req.params.id];
    if (!template) {
      return res.status(404).json({ message: 'Template not found' });
    }

    res.json({ template });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;