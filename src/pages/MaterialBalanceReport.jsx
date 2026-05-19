import { useMemo, useState } from 'react'
import * as XLSX from 'xlsx'
import { getMaterialBalanceReport } from '../api/materialBalanceReportApi'

function MaterialBalanceReport({ locations, assets }) {
  const emptyFilters = {
    locationCode: '',
    tankAssetCode: '',
    productName: '',
    dateFrom: '',
    dateTo: '',
  }

  const [filters, setFilters] = useState(emptyFilters)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  const activeLocations = useMemo(() => {
    return (locations || []).filter((location) => location.status === 'Active')
  }, [locations])

  const activeTankAssets = useMemo(() => {
    return (assets || []).filter((asset) => {
      if (asset.status !== 'Active') {
        return false
      }

      if (filters.locationCode && asset.locationCode) {
        return asset.locationCode === filters.locationCode
      }

      return true
    })
  }, [assets, filters.locationCode])

  const totals = useMemo(() => {
    return rows.reduce(
      (accumulator, row) => {
        accumulator.openingNsvBbl += row.openingNsvBbl
        accumulator.receiptNsvBbl += row.receiptNsvBbl
        accumulator.productionNsvBbl += row.productionNsvBbl
        accumulator.dispatchNsvBbl += row.dispatchNsvBbl
        accumulator.drainingNsvBbl += row.drainingNsvBbl
        accumulator.otherInNsvBbl += row.otherInNsvBbl
        accumulator.otherOutNsvBbl += row.otherOutNsvBbl
        accumulator.totalInNsvBbl += row.totalInNsvBbl
        accumulator.totalOutNsvBbl += row.totalOutNsvBbl
        accumulator.lossGainNsvBbl += row.lossGainNsvBbl

        accumulator.finalClosingNsvBbl = row.actualClosingNsvBbl
        accumulator.finalClosingLt = row.actualClosingLt
        accumulator.finalClosingMt = row.actualClosingMt

        return accumulator
      },
      {
        openingNsvBbl: 0,
        receiptNsvBbl: 0,
        productionNsvBbl: 0,
        dispatchNsvBbl: 0,
        drainingNsvBbl: 0,
        otherInNsvBbl: 0,
        otherOutNsvBbl: 0,
        totalInNsvBbl: 0,
        totalOutNsvBbl: 0,
        lossGainNsvBbl: 0,
        finalClosingNsvBbl: 0,
        finalClosingLt: 0,
        finalClosingMt: 0,
      }
    )
  }, [rows])

  const loadReport = async (activeFilters = filters) => {
    if (!activeFilters.dateFrom || !activeFilters.dateTo) {
      alert('Date From and Date To are required')
      return
    }

    try {
      setLoading(true)
      const data = await getMaterialBalanceReport(activeFilters)
      setRows(data)
    } catch (error) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target

    if (name === 'locationCode') {
      setFilters({
        ...filters,
        locationCode: value,
        tankAssetCode: '',
      })
      return
    }

    setFilters({
      ...filters,
      [name]: value,
    })
  }

  const handleApplyFilters = async (e) => {
    e.preventDefault()
    await loadReport(filters)
  }

  const handleClearFilters = () => {
    setFilters(emptyFilters)
    setRows([])
  }

  const formatNumber = (value, decimals = 3) => {
    return Number(value || 0).toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  const getNumberClass = (value) => {
    if (Number(value || 0) > 0) {
      return 'positive-number'
    }

    if (Number(value || 0) < 0) {
      return 'negative-number'
    }

    return ''
  }

  const escapeCsvValue = (value) => {
    if (value === null || value === undefined) {
      return ''
    }

    const text = String(value)

    if (
      text.includes(',') ||
      text.includes('"') ||
      text.includes('\n') ||
      text.includes('\r')
    ) {
      return `"${text.replace(/"/g, '""')}"`
    }

    return text
  }

  const downloadCsv = (filename, headers, dataRows) => {
    const csvLines = [
      headers.map(escapeCsvValue).join(','),
      ...dataRows.map((row) => row.map(escapeCsvValue).join(',')),
    ]

    const csvContent = csvLines.join('\n')
    const blob = new Blob([csvContent], {
      type: 'text/csv;charset=utf-8;',
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
  }

  const getExportHeaders = () => {
    return [
      'Accounting Date',
      'Location Code',
      'Location Name',
      'Tank Asset Code',
      'Tank Asset Name',
      'Product',
      'Opening NSV',
      'Receipt NSV',
      'Production NSV',
      'Dispatch NSV',
      'Draining NSV',
      'Other In NSV',
      'Other Out NSV',
      'Total In NSV',
      'Total Out NSV',
      'Book Closing NSV',
      'Actual Closing NSV',
      'Loss Gain NSV',
      'Closing LT',
      'Closing MT',
      'Rows Count',
      'Last Ticket',
    ]
  }

  const getExportDataRows = () => {
    return rows.map((row) => [
      row.accountingDate,
      row.locationCode,
      row.locationName,
      row.tankAssetCode,
      row.tankAssetName,
      row.productName || '',
      formatNumber(row.openingNsvBbl),
      formatNumber(row.receiptNsvBbl),
      formatNumber(row.productionNsvBbl),
      formatNumber(row.dispatchNsvBbl),
      formatNumber(row.drainingNsvBbl),
      formatNumber(row.otherInNsvBbl),
      formatNumber(row.otherOutNsvBbl),
      formatNumber(row.totalInNsvBbl),
      formatNumber(row.totalOutNsvBbl),
      formatNumber(row.bookClosingNsvBbl),
      formatNumber(row.actualClosingNsvBbl),
      formatNumber(row.lossGainNsvBbl),
      formatNumber(row.actualClosingLt),
      formatNumber(row.actualClosingMt),
      row.rowsCount,
      row.lastTicketNumber || '',
    ])
  }

  const handleExportCsv = () => {
    if (rows.length === 0) {
      alert('No Material Balance rows available to export')
      return
    }

    downloadCsv(
      'material-balance-report.csv',
      getExportHeaders(),
      getExportDataRows()
    )
  }

  const handleExportExcel = () => {
    if (rows.length === 0) {
      alert('No Material Balance rows available to export')
      return
    }

    const reportRows = rows.map((row) => ({
      'Accounting Date': row.accountingDate,
      'Location Code': row.locationCode,
      'Location Name': row.locationName,
      'Tank Asset Code': row.tankAssetCode,
      'Tank Asset Name': row.tankAssetName,
      Product: row.productName || '',
      'Opening NSV': Number(row.openingNsvBbl || 0),
      'Receipt NSV': Number(row.receiptNsvBbl || 0),
      'Production NSV': Number(row.productionNsvBbl || 0),
      'Dispatch NSV': Number(row.dispatchNsvBbl || 0),
      'Draining NSV': Number(row.drainingNsvBbl || 0),
      'Other In NSV': Number(row.otherInNsvBbl || 0),
      'Other Out NSV': Number(row.otherOutNsvBbl || 0),
      'Total In NSV': Number(row.totalInNsvBbl || 0),
      'Total Out NSV': Number(row.totalOutNsvBbl || 0),
      'Book Closing NSV': Number(row.bookClosingNsvBbl || 0),
      'Actual Closing NSV': Number(row.actualClosingNsvBbl || 0),
      'Loss Gain NSV': Number(row.lossGainNsvBbl || 0),
      'Closing LT': Number(row.actualClosingLt || 0),
      'Closing MT': Number(row.actualClosingMt || 0),
      'Rows Count': Number(row.rowsCount || 0),
      'Last Ticket': row.lastTicketNumber || '',
    }))

    const summaryRows = [
      {
        Particular: 'Opening NSV',
        Value: Number(totals.openingNsvBbl || 0),
      },
      {
        Particular: 'Receipt NSV',
        Value: Number(totals.receiptNsvBbl || 0),
      },
      {
        Particular: 'Production NSV',
        Value: Number(totals.productionNsvBbl || 0),
      },
      {
        Particular: 'Dispatch NSV',
        Value: Number(totals.dispatchNsvBbl || 0),
      },
      {
        Particular: 'Draining NSV',
        Value: Number(totals.drainingNsvBbl || 0),
      },
      {
        Particular: 'Total In NSV',
        Value: Number(totals.totalInNsvBbl || 0),
      },
      {
        Particular: 'Total Out NSV',
        Value: Number(totals.totalOutNsvBbl || 0),
      },
      {
        Particular: 'Final Closing NSV',
        Value: Number(totals.finalClosingNsvBbl || 0),
      },
      {
        Particular: 'Loss / Gain NSV',
        Value: Number(totals.lossGainNsvBbl || 0),
      },
    ]

    const filterRows = [
      {
        Filter: 'Location',
        Value: filters.locationCode || 'All Locations',
      },
      {
        Filter: 'Tank Asset',
        Value: filters.tankAssetCode || 'All Tanks',
      },
      {
        Filter: 'Product',
        Value: filters.productName || 'All Products',
      },
      {
        Filter: 'Accounting Date From',
        Value: filters.dateFrom || '',
      },
      {
        Filter: 'Accounting Date To',
        Value: filters.dateTo || '',
      },
    ]

    const workbook = XLSX.utils.book_new()

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(reportRows),
      'Material Balance'
    )

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(summaryRows),
      'Summary'
    )

    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.json_to_sheet(filterRows),
      'Filters'
    )

    XLSX.writeFile(workbook, 'material-balance-report.xlsx')
  }

  const handlePrintReport = () => {
    if (rows.length === 0) {
      alert('No Material Balance rows available to print')
      return
    }

    window.print()
  }

  return (
    <div className="material-balance-report-page">
      <div className="page-title">
        <div>
          <h2>Material Balance Report</h2>
          <p>
            Date-wise material balance from approved Tank Stock Ledger rows.
          </p>
        </div>

        <span className="record-count">{rows.length} Rows</span>
      </div>

      <form onSubmit={handleApplyFilters} className="filter-panel">
        <div>
          <label>Location</label>
          <select
            name="locationCode"
            value={filters.locationCode}
            onChange={handleFilterChange}
            disabled={loading}
          >
            <option value="">All Locations</option>

            {activeLocations.map((location) => (
              <option key={location.id} value={location.locationCode}>
                {location.locationName} ({location.locationCode})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Tank Asset</label>
          <select
            name="tankAssetCode"
            value={filters.tankAssetCode}
            onChange={handleFilterChange}
            disabled={loading}
          >
            <option value="">All Tanks</option>

            {activeTankAssets.map((asset) => (
              <option key={asset.id} value={asset.assetCode}>
                {asset.assetName} ({asset.assetCode})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Product</label>
          <input
            name="productName"
            type="text"
            value={filters.productName}
            onChange={handleFilterChange}
            placeholder="Example: Crude Oil"
            disabled={loading}
          />
        </div>

        <div>
          <label>Accounting Date From</label>
          <input
            name="dateFrom"
            type="date"
            value={filters.dateFrom}
            onChange={handleFilterChange}
            disabled={loading}
          />
        </div>

        <div>
          <label>Accounting Date To</label>
          <input
            name="dateTo"
            type="date"
            value={filters.dateTo}
            onChange={handleFilterChange}
            disabled={loading}
          />
        </div>

        <div className="filter-actions">
          <button type="submit" disabled={loading}>
            {loading ? 'Loading...' : 'Apply'}
          </button>
        </div>

        <div className="filter-actions">
          <button type="button" onClick={handleClearFilters} disabled={loading}>
            Clear
          </button>
        </div>

        <div className="filter-actions">
          <button type="button" onClick={handleExportCsv} disabled={loading}>
            Export CSV
          </button>
        </div>

        <div className="filter-actions">
          <button type="button" onClick={handleExportExcel} disabled={loading}>
            Export Excel
          </button>
        </div>

        <div className="filter-actions">
          <button type="button" onClick={handlePrintReport} disabled={loading}>
            Print Report
          </button>
        </div>
      </form>

      <div className="summary-card-grid">
        <div className="summary-card">
          <span>Receipt NSV</span>
          <strong>{formatNumber(totals.receiptNsvBbl)}</strong>
        </div>

        <div className="summary-card">
          <span>Production NSV</span>
          <strong>{formatNumber(totals.productionNsvBbl)}</strong>
        </div>

        <div className="summary-card">
          <span>Dispatch NSV</span>
          <strong>{formatNumber(totals.dispatchNsvBbl)}</strong>
        </div>

        <div className="summary-card">
          <span>Final Closing NSV</span>
          <strong>{formatNumber(totals.finalClosingNsvBbl)}</strong>
        </div>

        <div className="summary-card">
          <span>Loss / Gain NSV</span>
          <strong className={getNumberClass(totals.lossGainNsvBbl)}>
            {formatNumber(totals.lossGainNsvBbl)}
          </strong>
        </div>
      </div>

      <div className="print-report-header">
        <h2>Material Balance Report</h2>

        <div className="print-report-meta">
          <span>
            <strong>Location:</strong> {filters.locationCode || 'All Locations'}
          </span>

          <span>
            <strong>Tank:</strong> {filters.tankAssetCode || 'All Tanks'}
          </span>

          <span>
            <strong>Product:</strong> {filters.productName || 'All Products'}
          </span>

          <span>
            <strong>Accounting Date:</strong> {filters.dateFrom || '-'} to{' '}
            {filters.dateTo || '-'}
          </span>

          <span>
            <strong>Printed:</strong> {new Date().toLocaleString()}
          </span>
        </div>

        <div className="print-summary-grid">
          <div>
            <span>Receipt NSV</span>
            <strong>{formatNumber(totals.receiptNsvBbl)}</strong>
          </div>

          <div>
            <span>Production NSV</span>
            <strong>{formatNumber(totals.productionNsvBbl)}</strong>
          </div>

          <div>
            <span>Dispatch NSV</span>
            <strong>{formatNumber(totals.dispatchNsvBbl)}</strong>
          </div>

          <div>
            <span>Closing NSV</span>
            <strong>{formatNumber(totals.finalClosingNsvBbl)}</strong>
          </div>

          <div>
            <span>Loss / Gain NSV</span>
            <strong>{formatNumber(totals.lossGainNsvBbl)}</strong>
          </div>
        </div>
      </div>

      <div className="section-title">
        <h3>Material Balance Details</h3>
        <p>
          Opening is previous closing, closing is latest approved tank stock of
          the accounting day, and no-entry days carry forward previous closing.
        </p>
      </div>

      <table>
        <thead>
          <tr>
            <th>Accounting Date</th>
            <th>Location</th>
            <th>Tank</th>
            <th>Product</th>
            <th>Opening NSV</th>
            <th>Receipt NSV</th>
            <th>Production NSV</th>
            <th>Dispatch NSV</th>
            <th>Draining NSV</th>
            <th>Other In NSV</th>
            <th>Other Out NSV</th>
            <th>Total In NSV</th>
            <th>Total Out NSV</th>
            <th>Book Closing NSV</th>
            <th>Actual Closing NSV</th>
            <th>Loss / Gain NSV</th>
            <th>Closing LT</th>
            <th>Closing MT</th>
            <th>Rows</th>
            <th>Last Ticket</th>
          </tr>
        </thead>

        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan="20" className="empty-table">
                No Material Balance rows found.
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr key={`${row.accountingDate}-${row.tankAssetCode}-${index}`}>
                <td>{row.accountingDate}</td>
                <td>
                  {row.locationName} ({row.locationCode})
                </td>
                <td>
                  {row.tankAssetName} ({row.tankAssetCode})
                </td>
                <td>{row.productName || '-'}</td>
                <td>{formatNumber(row.openingNsvBbl)}</td>
                <td>{formatNumber(row.receiptNsvBbl)}</td>
                <td>{formatNumber(row.productionNsvBbl)}</td>
                <td>{formatNumber(row.dispatchNsvBbl)}</td>
                <td>{formatNumber(row.drainingNsvBbl)}</td>
                <td>{formatNumber(row.otherInNsvBbl)}</td>
                <td>{formatNumber(row.otherOutNsvBbl)}</td>
                <td>{formatNumber(row.totalInNsvBbl)}</td>
                <td>{formatNumber(row.totalOutNsvBbl)}</td>
                <td>{formatNumber(row.bookClosingNsvBbl)}</td>
                <td>{formatNumber(row.actualClosingNsvBbl)}</td>
                <td className={getNumberClass(row.lossGainNsvBbl)}>
                  {formatNumber(row.lossGainNsvBbl)}
                </td>
                <td>{formatNumber(row.actualClosingLt)}</td>
                <td>{formatNumber(row.actualClosingMt)}</td>
                <td>{row.rowsCount}</td>
                <td>{row.lastTicketNumber || '-'}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="info-box">
        Material Balance is calculated from approved Tank Stock Ledger rows. It
        does not require users to create a daily Closing Stock ticket.
      </div>
    </div>
  )
}

export default MaterialBalanceReport