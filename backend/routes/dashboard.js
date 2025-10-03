const express = require('express');
const Invoice = require('../models/Invoice');
const Client = require('../models/Client');
const auth = require('../middleware/auth');

const router = express.Router();

// Get dashboard overview
router.get('/overview', auth, async (req, res) => {
  try {
    const [invoices, clients] = await Promise.all([
      Invoice.find({ userId: req.user.id }),
      Client.find({ userId: req.user.id })
    ]);

    // Calculate invoice statistics
    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;
    const overdueInvoices = invoices.filter(inv => inv.status === 'overdue').length;
    const draftInvoices = invoices.filter(inv => inv.status === 'draft').length;
    
    const totalRevenue = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
    const paidRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const outstandingRevenue = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
    const overdueAmount = invoices
      .filter(inv => inv.status === 'overdue')
      .reduce((sum, inv) => sum + inv.remainingAmount, 0);

    // Recent invoices (last 5)
    const recentInvoices = invoices
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Monthly revenue for the last 12 months
    const monthlyRevenue = [];
    const currentDate = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const nextMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - i + 1, 1);
      
      const monthInvoices = invoices.filter(inv => {
        const invoiceDate = new Date(inv.createdAt);
        return invoiceDate >= date && invoiceDate < nextMonth;
      });

      monthlyRevenue.push({
        month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
        revenue: monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
        paid: monthInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
      });
    }

    // Top clients by revenue
    const clientRevenue = {};
    invoices.forEach(invoice => {
      const clientId = invoice.clientId.toString();
      if (!clientRevenue[clientId]) {
        clientRevenue[clientId] = 0;
      }
      clientRevenue[clientId] += invoice.totalAmount;
    });

    const topClients = await Promise.all(
      Object.entries(clientRevenue)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(async ([clientId, revenue]) => {
          const client = await Client.findById(clientId);
          return {
            client: client ? client.name : 'Unknown Client',
            revenue
          };
        })
    );

    // Upcoming due invoices (next 7 days)
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    
    const upcomingDue = invoices
      .filter(inv => 
        inv.status === 'sent' && 
        new Date(inv.dueDate) <= nextWeek &&
        new Date(inv.dueDate) >= new Date()
      )
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    const overview = {
      summary: {
        totalInvoices,
        paidInvoices,
        overdueInvoices,
        draftInvoices,
        totalRevenue,
        paidRevenue,
        outstandingRevenue,
        overdueAmount,
        totalClients: clients.length,
        activeClients: clients.filter(c => c.status === 'active').length
      },
      recentInvoices,
      monthlyRevenue,
      topClients,
      upcomingDue
    };

    res.json({ overview });
  } catch (error) {
    console.error('Get dashboard overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get revenue analytics
router.get('/analytics/revenue', auth, async (req, res) => {
  try {
    const { period = 'monthly', year = new Date().getFullYear() } = req.query;
    
    const invoices = await Invoice.find({ 
      userId: req.user.id,
      createdAt: {
        $gte: new Date(year, 0, 1),
        $lt: new Date(parseInt(year) + 1, 0, 1)
      }
    });

    let analytics = [];

    if (period === 'monthly') {
      for (let month = 0; month < 12; month++) {
        const monthStart = new Date(year, month, 1);
        const monthEnd = new Date(year, month + 1, 1);
        
        const monthInvoices = invoices.filter(inv => {
          const invoiceDate = new Date(inv.createdAt);
          return invoiceDate >= monthStart && invoiceDate < monthEnd;
        });

        analytics.push({
          period: monthStart.toLocaleString('default', { month: 'long' }),
          invoiced: monthInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
          paid: monthInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
          outstanding: monthInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0),
          count: monthInvoices.length
        });
      }
    } else if (period === 'quarterly') {
      const quarters = [
        { name: 'Q1', months: [0, 1, 2] },
        { name: 'Q2', months: [3, 4, 5] },
        { name: 'Q3', months: [6, 7, 8] },
        { name: 'Q4', months: [9, 10, 11] }
      ];

      quarters.forEach(quarter => {
        const quarterInvoices = invoices.filter(inv => {
          const month = new Date(inv.createdAt).getMonth();
          return quarter.months.includes(month);
        });

        analytics.push({
          period: quarter.name,
          invoiced: quarterInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
          paid: quarterInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
          outstanding: quarterInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0),
          count: quarterInvoices.length
        });
      });
    }

    res.json({ analytics, period, year });
  } catch (error) {
    console.error('Get revenue analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get client analytics
router.get('/analytics/clients', auth, async (req, res) => {
  try {
    const clients = await Client.find({ userId: req.user.id });
    const invoices = await Invoice.find({ userId: req.user.id });

    const clientAnalytics = clients.map(client => {
      const clientInvoices = invoices.filter(inv => 
        inv.clientId.toString() === client._id.toString()
      );

      return {
        client: {
          id: client._id,
          name: client.name,
          email: client.email,
          company: client.company
        },
        totalInvoices: clientInvoices.length,
        totalInvoiced: clientInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0),
        totalPaid: clientInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0),
        totalOutstanding: clientInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0),
        avgInvoiceValue: clientInvoices.length > 0 
          ? clientInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0) / clientInvoices.length 
          : 0,
        lastInvoiceDate: clientInvoices.length > 0 
          ? Math.max(...clientInvoices.map(inv => new Date(inv.createdAt))) 
          : null
      };
    });

    // Sort by total invoiced amount
    clientAnalytics.sort((a, b) => b.totalInvoiced - a.totalInvoiced);

    res.json({ clientAnalytics });
  } catch (error) {
    console.error('Get client analytics error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;