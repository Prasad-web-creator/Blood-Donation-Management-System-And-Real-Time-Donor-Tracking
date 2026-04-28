import jsPDF from 'jspdf';

export const generateInventoryReport = async (
  inventoryData: any[],
  donors: any[],
  fileName: string = 'blood-inventory-report.pdf'
) => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // ===== HEADER =====
    pdf.setFontSize(22);
    pdf.setFont(undefined, 'bold');
    pdf.text('Blood Bank Inventory Report', margin, yPosition);
    
    yPosition += 8;
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);

    // ===== DIVIDER =====
    yPosition += 6;
    pdf.setDrawColor(150);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);

    // ===== SECTION 1: BLOOD STOCK SUMMARY =====
    yPosition += 8;
    pdf.setFontSize(13);
    pdf.setFont(undefined, 'bold');
    pdf.text('Blood Stock Summary', margin, yPosition);

    yPosition += 7;
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    
    // Column positions for stock table
    const stockCol1X = margin;
    const stockCol2X = margin + 55;
    const stockCol3X = margin + 95;

    // Table header
    pdf.setFillColor(220, 20, 60);
    pdf.setTextColor(255, 255, 255);
    pdf.rect(margin - 1, yPosition - 4.5, contentWidth + 2, 6, 'F');
    pdf.text('Blood Type', stockCol1X + 2, yPosition);
    pdf.text('Units in Stock', stockCol2X + 2, yPosition);
    pdf.text('Status', stockCol3X + 2, yPosition);

    pdf.setTextColor(0, 0, 0);
    yPosition += 7;
    const lineHeight = 5.5;

    // Table data
    pdf.setFont(undefined, 'normal');
    inventoryData.forEach((item, idx) => {
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = margin;
      }

      const status =
        item.units === 0
          ? 'Critical'
          : item.units <= 5
          ? 'Low'
          : 'Optimal';
      
      // Alternate row background
      if (idx % 2 === 0) {
        pdf.setFillColor(240, 240, 240);
        pdf.rect(margin - 1, yPosition - 4, contentWidth + 2, lineHeight, 'F');
      }

      pdf.text(item.type, stockCol1X + 2, yPosition);
      pdf.text(String(item.units), stockCol2X + 2, yPosition);
      
      const statusColor = status === 'Critical' ? [220, 20, 60] : status === 'Low' ? [255, 165, 0] : [34, 139, 34];
      pdf.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      pdf.text(status, stockCol3X + 2, yPosition);
      pdf.setTextColor(0, 0, 0);

      yPosition += lineHeight;
    });

    // Total stock summary
    yPosition += 4;
    pdf.setDrawColor(200);
    pdf.setLineWidth(0.3);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);

    yPosition += 5;
    pdf.setFont(undefined, 'bold');
    const totalStock = inventoryData.reduce((sum, item) => sum + (item.units || 0), 0);
    pdf.text(`Total Units in Stock: ${totalStock}`, margin, yPosition);
    pdf.setFont(undefined, 'normal');

    // ===== SECTION 2: DONOR DETAILS =====
    yPosition += 10;
    
    if (yPosition > pageHeight - 60) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(13);
    pdf.setFont(undefined, 'bold');
    pdf.text('Registered Donors Details', margin, yPosition);

    yPosition += 7;
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');

    // Donor table header
    const dCol1X = margin;
    const dCol2X = margin + 45;
    const dCol3X = margin + 80;
    const dCol4X = margin + 130;

    pdf.setFillColor(220, 20, 60);
    pdf.setTextColor(255, 255, 255);
    pdf.rect(margin - 1, yPosition - 4.5, contentWidth + 2, 6, 'F');
    pdf.text('Name', dCol1X + 2, yPosition);
    pdf.text('Blood Type', dCol2X + 2, yPosition);
    pdf.text('Contact', dCol3X + 2, yPosition);
    pdf.text('Status', dCol4X + 2, yPosition);

    pdf.setTextColor(0, 0, 0);
    yPosition += 7;

    // Donor table data
    pdf.setFont(undefined, 'normal');
    pdf.setFontSize(8.5);

    donors.forEach((donor, idx) => {
      if (yPosition > pageHeight - 20) {
        pdf.addPage();
        yPosition = margin;
        
        // Reprint header on new page
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.setFillColor(220, 20, 60);
        pdf.setTextColor(255, 255, 255);
        pdf.rect(margin - 1, yPosition - 4.5, contentWidth + 2, 6, 'F');
        pdf.text('Name', dCol1X + 2, yPosition);
        pdf.text('Blood Type', dCol2X + 2, yPosition);
        pdf.text('Contact', dCol3X + 2, yPosition);
        pdf.text('Status', dCol4X + 2, yPosition);
        
        pdf.setTextColor(0, 0, 0);
        yPosition += 7;
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(8.5);
      }

      // Alternate row background
      if (idx % 2 === 0) {
        pdf.setFillColor(245, 245, 245);
        pdf.rect(margin - 1, yPosition - 3.5, contentWidth + 2, 5.2, 'F');
      }

      const truncate = (str: string, max: number) => 
        str.length > max ? str.substring(0, max - 3) + '...' : str;

      const name = truncate(donor.name || '—', 18);
      const bloodType = donor.bloodGroup || donor.bloodType || '—';
      const contact = truncate(donor.contact || donor.phone || '—', 18);
      const status = truncate((donor.status || 'Active').toString().toUpperCase(), 10);

      pdf.setTextColor(0, 0, 0);
      pdf.text(name, dCol1X + 2, yPosition);
      pdf.text(bloodType, dCol2X + 2, yPosition);
      pdf.text(contact, dCol3X + 2, yPosition);
      pdf.text(status, dCol4X + 2, yPosition);

      yPosition += 5.2;
    });

    // ===== FOOTER =====
    yPosition += 5;
    if (yPosition > pageHeight - 15) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.setFontSize(8);
    pdf.setFont(undefined, 'normal');
    pdf.setDrawColor(150);
    pdf.setLineWidth(0.5);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 4;
    
    pdf.setFont(undefined, 'bold');
    pdf.text(`Total Donors Registered: ${donors.length}`, margin, yPosition);
    
    yPosition += 4;
    pdf.setFont(undefined, 'normal');
    const totalActiveCount = donors.filter(d => (d.status || '').toString().toLowerCase() === 'active').length;
    pdf.text(`Active Donors: ${totalActiveCount}`, margin, yPosition);

    // Download
    pdf.save(fileName);
  } catch (error) {
    console.error('Failed to generate PDF report:', error);
    throw error;
  }
};
