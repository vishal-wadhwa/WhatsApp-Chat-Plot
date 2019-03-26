const utils = {
	debounce(fn, timeout) {
		let timerId = null
		return function () {
			const _this = this
			const args = arguments

			if (timerId) {
				clearTimeout(timerId)
				timerId = null
			}
			timerId = setTimeout(() => {
				fn.apply(_this, args)
			}, timeout)
		}
	},
	downloadURI(uri, name) {
		const link = document.createElement("a");
		link.download = name;
		link.href = uri;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
	}
}

Chart.plugins.register({
	beforeDraw: function (chartInstance, easing) {
		const ctx = chartInstance.chart.ctx
		ctx.fillStyle = chartInstance.chart.options.bgColor // your color here

		const canvas = chartInstance.canvas
		ctx.fillRect(0, 0, canvas.width, canvas.height)
	}
})

const ChatChart = (function () {
	// Utils
	const type = function (cfg, val) { cfg.type = val }
	const granularity = function (cfg, val) { cfg.options.scales.xAxes[0].time.unit = val }
	const distribution = function (cfg, val) { cfg.options.scales.xAxes[0].distribution = val }
	const smoothen = function (cfg, val) { cfg.options.elements.line = val ? {} : { tension: 0 } }
	const showLines = function (cfg, val) { cfg.options.showLines = val }
	const datasets = function (cfg, val) { cfg.data.datasets = val }
	const bgColor = function (cfg, val) { cfg.options.bgColor = val || 'transparent' }
	const title = function (cfg, val) {
		cfg.options.title.display = !!val
		if (val) cfg.options.title.text = val
	}
	const showGrid = function (cfg, val) {
		cfg.options.scales.xAxes[0].gridLines.display = val
		cfg.options.scales.yAxes[0].gridLines.display = val
	}

	const chartjsConfigSetters = {
		type,
		granularity,
		distribution,
		smoothen,
		showLines,
		datasets,
		bgColor,
		title,
		showGrid
	}

	const buildConfig = function (opts, defCfg) {
		const cfg = { ...defCfg }
		Object.keys(chartjsConfigSetters).forEach(k => {
			if (opts.hasOwnProperty(k)) chartjsConfigSetters[k](cfg, opts[k])
		})
		return cfg
	}

	const randomInt = (max, min = 0) => min + Math.random() * (max - min) >> 0
	const randomColor = (minOp = 0.5, maxOp = 1, minClr = 0, maxClr = 256) => {
		const red = randomInt(maxClr, minClr)
		const green = randomInt(maxClr, minClr)
		const blue = randomInt(maxClr, minClr)
		const op = minOp + Math.random() * (maxOp - minOp)
		const toString = function () { return `rgba(${this.red}, ${this.green}, ${this.blue}, ${this.op})` }
		return { red, green, blue, op, toString }
	}

	// Private
	const granularDateHash = function () {
		const opt = this.opts.granularity.toLowerCase()
		let fmtTime = ""
		let fmtDate = ""
		switch (opt) {
			case "minute":
				fmtTime = "mm A"
			case "hour":
				fmtTime = "h" + (fmtTime.length > 0 ? ":" + fmtTime : " A")
			case "day":
				fmtDate = "DD"
			case "month":
				fmtDate += (fmtDate.length > 0 ? "/" : "") + "MM"
				break

			case "week":
				fmtDate = "w"
				break

			case "quarter":
				fmtDate = "Q"
				break

			case "year":
				break

			default:
				throw new Error("Unknown granularity " + opt)
		}

		fmtDate += (fmtDate.length > 0 ? "/" : "") + "YY"
		const finalTS = fmtDate + " " + fmtTime

		return finalTS.trim()
	}

	const groupByDateHash = function () {
		const dateToFmt = granularDateHash.call(this)
		const freq = this.rawFileData.split('\n').reduce((acc, cur) => {

			const [datestr, ...nameAndMsgArr] = cur.trim().split('-')
			const nameAndMsg = nameAndMsgArr.join('-').trim()
			const [name, ...msgArr] = nameAndMsg.split(':')
			const date = moment(datestr.trim(), this.opts.dateParseFmt, true)
			const msg = msgArr.join(':').trim()

			if (date.isValid() && name.length > 0 && msg.length > 0) {
				const dateFmtdStr = date.format(dateToFmt)
				const dateFmtd = moment(dateFmtdStr, dateToFmt, true)

				if (!acc[name]) acc[name] = {}
				if (!acc[name][dateFmtdStr]) acc[name][dateFmtdStr] = { date: dateFmtd, val: 0 }
				acc[name][dateFmtdStr].val += 1
			}
			return acc
		}, {})

		const distribution = {}
		Object.keys(freq).forEach(key => {
			distribution[key] = Object
				.values(freq[key])
				.sort((a, b) => a.date.valueOf() - b.date.valueOf())
				.map(o => ({ x: o.date.toDate(), y: o.val }))

		})

		return distribution
	}

	const transformDataPoints = function () {
		const datasets = Object.keys(this.distributedData).map(k => {
			const rc = randomColor(0.7)
			const rcbg = { ...rc }
			rcbg.op /= 2

			return {
				label: k,
				data: this.distributedData[k],
				borderColor: rc.toString(),
				backgroundColor: rcbg.toString(),
				fill: this.opts.fillArea
			}
		})

		return datasets
	}

	// constructor
	function ChatChart(canvasId, inputId, opts) {
		const defCfg = {
			// The type of chart we want to create
			type: 'line',

			// The data for our dataset
			data: { datasets: [] },

			// Configuration options go here
			options: {
				scales: {
					xAxes: [{
						type: 'time',
						time: {
							unit: 'month'
						},
						distribution: 'series',
						gridLines: { display: true },
						scaleLabel: {
							display: true,
							labelString: 'time'
						}
					}],
					yAxes: [{
						gridLines: { display: true },
						scaleLabel: {
							display: true,
							labelString: 'messages'
						}
					}]
				},
				elements: {
					line: {}
				},
				title: {
					display: false,
					text: ''
				},
				showLines: true,
				bgColor: 'transparent'
			}
		}

		this.canvasId = canvasId
		this.inputId = inputId
		this.rawFileData = null
		this.distributedData = null
		this.chart = null
		this.filename = null
		this.opts = {
			bgColor: 'transparent',
			datasets: [],
			dateParseFmt: 'DD/MM/YY, h:mm A',
			distribution: 'series',
			fillArea: true,
			granularity: 'month',
			lazy: false,
			showGrid: true,
			showLines: true,
			smoothen: true,
			title: '',
			type: 'line',
			...opts
		}

		if (!this.opts.lazy) {
			const ctx = document.getElementById(this.canvasId).getContext('2d')
			this.chart = new Chart(ctx, buildConfig(this.opts, defCfg))
		}

		const inputFile = document.getElementById(inputId)
		inputFile.addEventListener('change', () => {
			if (inputFile.files.length > 0) {
				const curFile = inputFile.files[0]
				if (curFile.type !== 'text/plain') return

				this.filename = curFile.name
				document.querySelector(`[data-filename-for=${inputId}]`).textContent = curFile.name

				const reader = new FileReader()
				reader.addEventListener('loadend', () => {
					this.rawFileData = reader.result
					this.distributedData = groupByDateHash.call(this)
					this.opts.datasets = transformDataPoints.call(this)

					if (!this.chart) {
						const ctx = document.getElementById(this.canvasId).getContext('2d')
						this.chart = new Chart(ctx, buildConfig(this.opts, defCfg))
					} else {
						chartjsConfigSetters.datasets(this.chart.config, this.opts.datasets)
						this.chart.update()
					}
				})
				reader.readAsText(curFile)
			}
		})

	}

	// Public
	ChatChart.prototype = {
		constructor: ChatChart,
		setGranularity(granularity) {
			this.opts.granularity = granularity
			if (this.chart) {
				chartjsConfigSetters.granularity(this.chart.config, granularity)

				this.distributedData = groupByDateHash.call(this)
				this.opts.datasets = transformDataPoints.call(this)

				chartjsConfigSetters.datasets(this.chart.config, this.opts.datasets)

				this.chart.update()
			}
		},
		setDistribution(distribution) {
			this.opts.distribution = distribution
			if (this.chart) {
				chartjsConfigSetters.distribution(this.chart.config, distribution)
				this.chart.update()
			}
		},
		setType(type) {
			this.opts.type = type
			if (this.chart) {
				this.chart.clear()
				chartjsConfigSetters.type(this.chart.config, type)
				this.chart.update()
			}
		},
		setSmooth(smooth) {
			this.opts.smoothen = smooth
			if (this.chart) {
				chartjsConfigSetters.smoothen(this.chart.config, smooth)
				this.chart.update({ duration: 0 })
			}
		},
		setGridVisibility(visible) {
			this.opts.showGrid = visible
			if (this.chart) {
				chartjsConfigSetters.showGrid(this.chart.config, visible)
				this.chart.update()
			}
		},
		setP2PLineVisiblity(visible) {
			this.opts.showLines = visible
			if (this.chart) {
				chartjsConfigSetters.showLines(this.chart.config, visible)
				this.chart.update()
			}
		},
		setAreaFill(fill) {
			this.opts.fillArea = fill
			if (this.chart) {
				this.opts.datasets = transformDataPoints.call(this)
				chartjsConfigSetters.datasets(this.chart.config, this.opts.datasets)
				this.chart.update({duration: 0})
			}
		},
		setTitle(title) {
			this.opts.title = title
			if (this.chart) {
				chartjsConfigSetters.title(this.chart.config, title)
				this.chart.update()
			}
		},
		setDateParseFormat(fmt) {
			this.opts.dateParseFmt = fmt
			if (this.chart) {
				this.distributedData = groupByDateHash.call(this)
				this.opts.datasets = transformDataPoints.call(this)

				chartjsConfigSetters.datasets(this.chart.config, this.opts.datasets)

				this.chart.update()
			}
		},
		setBgColor(clr) {
			this.opts.bgColor = clr
			if (this.chart) {
				chartjsConfigSetters.bgColor(this.chart.config, this.opts.bgColor)
				this.chart.update()
			}
		},
		refresh() {
			if (this.chart) {
				this.opts.datasets = transformDataPoints.call(this)
				chartjsConfigSetters.datasets(this.chart.config, this.opts.datasets)
				this.chart.update({ duration: 0 })
			}
		},
		toPngUrl() {
			if (this.chart) return this.chart.toBase64Image()
			return null
		}
	}

	return ChatChart
})()

const chatChart = new ChatChart('chart', 'chat-input', { lazy: true })

const selectGranularity = document.getElementById('granularity-select')
const selectDistribution = document.getElementById('distribution-select')
const selectChart = document.getElementById('chart-select')

const cboxSmoothen = document.getElementById('smooth-check')
const cboxShowLines = document.getElementById('show-lines-check')
const cboxShowGrid = document.getElementById('show-grid-check')
const cboxFillArea = document.getElementById('fill-area-check')
const cboxWhiteBg = document.getElementById('white-bg-check')

const textTitle = document.getElementById('title-text')
const textDateParseFormat = document.getElementById('date-parse-format-text')

const btnRefresh = document.getElementById('refresh-btn')
const btnDownload = document.getElementById('download-btn')

selectGranularity.addEventListener('change', ({ target: { value } }) => {
	chatChart.setGranularity(value)
})

selectDistribution.addEventListener('change', ({ target: { value } }) => {
	chatChart.setDistribution(value)
})

selectChart.addEventListener('change', ({ target: { value } }) => {
	chatChart.setType(value)
})

cboxSmoothen.addEventListener('change', ({ target: { checked } }) => {
	chatChart.setSmooth(checked)
})

cboxShowLines.addEventListener('change', ({ target: { checked } }) => {
	chatChart.setP2PLineVisiblity(checked)
})

cboxShowGrid.addEventListener('change', ({ target: { checked } }) => {
	chatChart.setGridVisibility(checked)
})

cboxFillArea.addEventListener('change', ({ target: { checked } }) => {
	chatChart.setAreaFill(checked)
})

cboxWhiteBg.addEventListener('change', ({ target: { checked } }) => {
	chatChart.setBgColor(checked ? 'white' : 'transparent')
})

const titleInputListener = ({ target: { value } }) => {
	chatChart.setTitle(value)
}
textTitle.addEventListener('input', utils.debounce(titleInputListener, 500))

textDateParseFormat.value = 'DD/MM/YY, h:mm A'
const dateParseFmtInputListener = ({ target: { value } }) => {
	chatChart.setDateParseFormat(value)
}
textDateParseFormat.addEventListener('input', utils.debounce(dateParseFmtInputListener, 500))

btnRefresh.addEventListener('click', ev => chatChart.refresh())

btnDownload.addEventListener('click', ev => {
	const data = chatChart.toPngUrl()
	if (data) {
		utils.downloadURI(data, chatChart.opts.title || chatChart.filename.split('.').slice(0, -1).join('.'))
	}
})
