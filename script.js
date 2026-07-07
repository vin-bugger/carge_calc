document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('calc-form');
    const btnClear = document.getElementById('btn-clear');
    
    // Inputs
    const segmentEl = document.getElementById('segment');
    const exchangeEl = document.getElementById('exchange');
    const brokerageFeeEl = document.getElementById('brokerage-fee');
    const quantityEl = document.getElementById('quantity');
    const buyPriceEl = document.getElementById('buy-price');
    const sellPriceEl = document.getElementById('sell-price');
    
    // List & Count
    const tradesListEl = document.getElementById('trades-list');
    const tradeCountEl = document.getElementById('trade-count');
    
    // Outputs
    const resTurnover = document.getElementById('res-turnover');
    const resBrokerage = document.getElementById('res-brokerage');
    const resStt = document.getElementById('res-stt');
    const resExchange = document.getElementById('res-exchange');
    const resGst = document.getElementById('res-gst');
    const resSebi = document.getElementById('res-sebi');
    const resStamp = document.getElementById('res-stamp');
    const resTotalCharges = document.getElementById('res-total-charges');
    const resNetPnl = document.getElementById('res-net-pnl');
    const pnlCard = document.getElementById('pnl-card');

    let trades = [];

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    };

    const calculateTradeCharges = (segment, exchange, qty, buyPrice, sellPrice) => {
        const buyTurnover = buyPrice * qty;
        const sellTurnover = sellPrice * qty;
        const totalTurnover = buyTurnover + sellTurnover;

        const brokerage = (parseFloat(brokerageFeeEl.value) || 0) * 2; // charged for both buy & sell orders

        let stt = 0;
        if (segment === 'futures') {
            stt = sellTurnover * 0.0005;
        } else if (segment === 'options') {
            stt = sellTurnover * 0.0015; 
        }
        stt = Math.round(stt);

        let exchangeCharges = 0;
        if (exchange === 'nse') {
            if (segment === 'futures') {
                exchangeCharges = totalTurnover * 0.0000173;
            } else if (segment === 'options') {
                exchangeCharges = totalTurnover * 0.0003503;
            }
        } else if (exchange === 'bse') {
            if (segment === 'futures') {
                exchangeCharges = 0;
            } else if (segment === 'options') {
                exchangeCharges = totalTurnover * 0.000325;
            }
        }

        const sebiCharges = totalTurnover * 0.000001; 

        const gst = (brokerage + exchangeCharges + sebiCharges) * 0.18;

        let stampDuty = 0;
        if (segment === 'futures') {
            stampDuty = buyTurnover * 0.00002;
        } else if (segment === 'options') {
            stampDuty = buyTurnover * 0.00003;
        }
        stampDuty = Math.round(stampDuty);

        const totalCharges = brokerage + stt + exchangeCharges + sebiCharges + gst + stampDuty;
        const grossPnl = sellTurnover - buyTurnover;
        const netPnl = grossPnl - totalCharges;

        return {
            buyTurnover, sellTurnover, totalTurnover,
            brokerage, stt, exchangeCharges, sebiCharges, gst, stampDuty,
            totalCharges, grossPnl, netPnl
        };
    };

    const updateUI = () => {
        // Update trades list
        if (trades.length === 0) {
            tradesListEl.innerHTML = '<p class="empty-state" id="empty-state">No trades added yet. Add a trade above.</p>';
            tradeCountEl.textContent = '0';
        } else {
            tradesListEl.innerHTML = '';
            tradeCountEl.textContent = trades.length;
            trades.forEach((trade, index) => {
                const item = document.createElement('div');
                item.className = 'trade-item';
                
                const title = `${trade.exchange.toUpperCase()} ${trade.segment.charAt(0).toUpperCase() + trade.segment.slice(1)}`;
                
                item.innerHTML = `
                    <div class="trade-item-header">
                        <span>Trade #${index + 1} - ${title}</span>
                        <button class="trade-remove" data-index="${index}">✕ Remove</button>
                    </div>
                    <div class="trade-detail"><span>Qty:</span> <span class="val">${trade.qty}</span></div>
                    <div class="trade-detail"><span>Net P&L:</span> <span class="val" style="color: ${trade.charges.netPnl >= 0 ? 'var(--success)' : 'var(--danger)'}">${formatCurrency(trade.charges.netPnl)}</span></div>
                    <div class="trade-detail"><span>Buy:</span> <span class="val">₹${trade.buyPrice}</span></div>
                    <div class="trade-detail"><span>Sell:</span> <span class="val">₹${trade.sellPrice}</span></div>
                `;
                tradesListEl.appendChild(item);
            });
            
            // Attach remove events
            document.querySelectorAll('.trade-remove').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const idx = parseInt(e.target.getAttribute('data-index'));
                    trades.splice(idx, 1);
                    updateUI();
                });
            });
        }

        // Aggregate Totals
        const aggr = trades.reduce((acc, curr) => {
            const c = curr.charges;
            return {
                totalTurnover: acc.totalTurnover + c.totalTurnover,
                brokerage: acc.brokerage + c.brokerage,
                stt: acc.stt + c.stt,
                exchangeCharges: acc.exchangeCharges + c.exchangeCharges,
                gst: acc.gst + c.gst,
                sebiCharges: acc.sebiCharges + c.sebiCharges,
                stampDuty: acc.stampDuty + c.stampDuty,
                totalCharges: acc.totalCharges + c.totalCharges,
                netPnl: acc.netPnl + c.netPnl
            };
        }, {
            totalTurnover: 0, brokerage: 0, stt: 0, exchangeCharges: 0,
            gst: 0, sebiCharges: 0, stampDuty: 0, totalCharges: 0, netPnl: 0
        });

        // Update Summary Output
        resTurnover.textContent = formatCurrency(aggr.totalTurnover);
        resBrokerage.textContent = formatCurrency(aggr.brokerage);
        resStt.textContent = formatCurrency(aggr.stt);
        resExchange.textContent = formatCurrency(aggr.exchangeCharges);
        resGst.textContent = formatCurrency(aggr.gst);
        resSebi.textContent = formatCurrency(aggr.sebiCharges);
        resStamp.textContent = formatCurrency(aggr.stampDuty);
        resTotalCharges.textContent = formatCurrency(aggr.totalCharges);
        resNetPnl.textContent = formatCurrency(aggr.netPnl);

        // PNL Styling
        if (aggr.netPnl > 0 || (aggr.netPnl === 0 && trades.length === 0)) {
            resNetPnl.className = 'pnl-value text-success';
            pnlCard.style.boxShadow = 'none';
            pnlCard.style.borderColor = 'var(--card-border)';
        } else if (aggr.netPnl < 0) {
            resNetPnl.className = 'pnl-value text-danger';
            pnlCard.style.boxShadow = 'none';
            pnlCard.style.borderColor = 'var(--card-border)';
        }
    };

    const addTrade = (e) => {
        e.preventDefault();

        const segment = segmentEl.value;
        const exchange = exchangeEl.value;
        const qty = parseFloat(quantityEl.value) || 0;
        const buyPrice = parseFloat(buyPriceEl.value) || 0;
        const sellPrice = parseFloat(sellPriceEl.value) || 0;

        if (qty <= 0 || buyPrice < 0 || sellPrice < 0) return;

        const charges = calculateTradeCharges(segment, exchange, qty, buyPrice, sellPrice);
        
        trades.push({
            segment, exchange, qty, buyPrice, sellPrice, charges
        });
        
        updateUI();
        
        // Reset specific inputs but keep segment/exchange to allow fast adding
        buyPriceEl.value = '';
        sellPriceEl.value = '';
        buyPriceEl.focus();
    };

    form.addEventListener('submit', addTrade);
    
    btnClear.addEventListener('click', () => {
        trades = [];
        updateUI();
    });

    // Initialize UI
    updateUI();
});
