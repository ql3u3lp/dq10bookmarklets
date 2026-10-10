(function() {
	'use strict';

	var INTERVAL_MSEC = 1000;

	// Checks whether the URL is correct. And then, gets the character ID from it.
	if (window.location.href.indexOf('https://hiroba.dqx.jp/sc/senreki/monster/') < 0) {
		alert('「討伐モンスターリスト」に移動してから、再度本ブックマークを実行してください。');
		return;
	}

	var baseUrl = window.location.href;
	var pageNum = 0;

	var lastUrl = $('li.last a.pagerBottom').attr('href');
	if (lastUrl) {
		var m = lastUrl.match(/(.*\/)(\d+)/);
		if (!m || m.length <= 2) {
			alert('ERROR');
			return;
		}
		baseUrl = m[1];
		pageNum = parseInt(m[2], 10) + 1;
	}

	var monsters = [];

	// Creates and displays own content box.
	$('#myBox').remove();
	$('#contentArea').prepend('<div id="myBox" class="cttBox" style="margin-bottom: 20px; padding: 20px 32px 20px 20px;"></div>');

	// Creates function calls.
	var callbacks = [];

	if (pageNum === 0) {
		// Analyzes from the current page.
		callbacks.push(function() {
			var items = getMonstersFromHtml($('html'));
			monsters = monsters.concat(items);
		});
	} else {
		// Loads and analyzes each page.
		for (var i = 0; i < pageNum; i++) {
			/* jshint loopfunc: true */
			callbacks.push((function(index) {
				return function() {
					var d = $.Deferred();
					setTimeout(function() {
						$.get(baseUrl + index, function(data) {
							var items = getMonstersFromHtml(data);
							monsters = monsters.concat(items);

						}).done(function() {
							$('#myBox').text('Now loading...: ' + (index + 1) + ' / ' + pageNum);
							d.resolve();

						}).fail(function() {
							$('#myBox').text('Error');
							d.reject();
						});
					}, INTERVAL_MSEC);
					return d.promise();
				};
			})(i));
		}
	}

	// Registers function calls and invokes them.
	var dfd = $.Deferred();
	dfd.resolve();
	for (var i = 0; i < callbacks.length; i++) {
		dfd = dfd.pipe(callbacks[i]);
	}
	dfd.done(function() {
		// Makes a CSV data.
	var headers = [
    {key: 'name', name: 'モンスター名'},
    {key: 'count', name: '討伐数'},
    {key: 'exp', name: '経験値'},
    {key: 'stamp', name: '特訓スタンプ'},
    {key: 'gold', name: 'ゴールド'},
    {key: 'isScanned', name: 'みやぶる'},

    {key: 'url', name: 'URL'},
];

		var csv = '\uFEFF';	// BOM for Microsoft Excel
		for (var i = 0; i < headers.length; i++) {
			csv += headers[i].name + ((i === headers.length - 1) ? '\r\n' : ',');
		}
		for (var i = 0; i < monsters.length; i++) {
			var monster = monsters[i];
			for (var j = 0; j < headers.length; j++) {
				if (j > 0) {
					csv += ',';
				}
				var key = headers[j].key;
				var value = monster[key];
				switch (key) {
				case 'isScanned':
					value = (value) ? '済' : '未';
					break;
				case 'isDefeatTarget':
					value = (value) ? '討伐対象' : '';
					break;
				}
				csv += value;
			}
			csv += '\r\n';
		}

		// Makes the base of the filename.
		var d = new Date();
		var fileName = 'monsters_' + d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);

		// Makes the content.
		$('#myBox').empty()
				.append('<h2>討伐モンスターリスト</h2>')
				.append('<ul id="myList" style="margin: 8px 0;"></ul>')
				.append('<textarea id="myCsv" readonly="readonly" style="width: 100%; height: 30em;">' + csv + '</textarea>');

		// download link
		if ($.browser.msie) {
			$('#myBox').append('<iframe id="myDummy" style="visibility: hidden; width: 0; height: 0;"></iframe>')
				.append('<p>討伐モンスターリスト ダウンロードリンク: <a href="#" onclick="var d = self.myDummy.document; d.open(); d.write(self.myCsv.value); d.close(); d.execCommand(&quot;SaveAs&quot;, true, &quot;' + fileName + '.csv&quot;); return false;">' + fileName + '.csv</a></p>');
		} else {
			$('#myBox').append('<p>討伐モンスターリスト ダウンロードリンク: <a download = "' + fileName + '.csv" href="data:application/octet-stream,' + encodeURIComponent(csv) + '">' + fileName + '.csv</a></p>');
		}
	});

	function getMonstersFromHtml(data) {
		var items = [];
		$('table.senreki-table tr', data).each(function() {
			var $tds = $(this).find('td');
			if ($tds.length < 6) {
				return true;
			}

			var monster = {};

			monster.count = Number($tds.eq(1).text().replace(/[^\d]/g, ''));
			monster.name  = $.trim($tds.eq(2).text());
			monster.url = $tds.eq(2).find('a').attr('href') || '';
			monster.exp   = Number($tds.eq(3).text().replace(/[^\d]/g, ''));
			monster.stamp = Number($tds.eq(4).text().replace(/[^\d]/g, ''));
			monster.gold  = Number($tds.eq(5).text().replace(/[^\d]/g, ''));

			monster.isScanned      = (($tds.eq(2).find('a').attr('class') || '').indexOf('mon-name-scanned') >= 0);
			monster.isDefeatTarget = ($tds.eq(0).attr('class').indexOf('defeat-none-ico') < 0);
			monster.isCrowned      = ($tds.eq(0).attr('class').indexOf('defeat-crown-ico') >= 0);

			items.push(monster);
		});

		return items;
	}
})();
