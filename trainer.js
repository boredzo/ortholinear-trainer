let keyboard_columns = [
	[ '1', '\'', 'a', ';', ],
	[ '2', ',', 'o', 'q', ],
	[ '3', '.', 'e', 'j', ],
	[ '4', 'p', 'u', 'k', ],
	[ '5', 'y', 'i', 'x', ],
	[ '6', 'f', 'd', 'b', ],
	[ '7', 'g', 'h', 'm', ],
	[ '8', 'c', 't', 'w', ],
	[ '9', 'r', 'n', 'v', ],
	[ '0', 'l', 's', 'z', ],
	[ '[', '\\', '-', '/', ],
];
let remedial_columns = [];
let max_remedial_columns = 5;
let number_row_idx = 0, top_row_idx = 1, home_row_idx = 2, bottom_row_idx = 3;

function make_word(column, include_number_row, include_top_row, include_home_row, include_bottom_row, reverse_order) {
	let word = [];
	if (column.length < 4) {
		//This is a remedial column that has already had exclusions applied.
		word.splice(0, word.length);
		word.push.apply(word, column);
	} else {
		if (include_number_row) {
			word.push(column[number_row_idx]);
		}
		if (include_top_row) {
			word.push(column[top_row_idx]);
		}
		if (include_home_row) {
			word.push(column[home_row_idx]);
		}
		if (include_bottom_row) {
			word.push(column[bottom_row_idx]);
		}
		if (reverse_order) {
			word.reverse();
		}
	}
	return word;
}
function make_line(min_words=3, max_words=20) {
	var num_words = Math.random() * (max_words - min_words) + min_words;

	let include_number_row = document.getElementById('include_number_row').getAttribute('checked') !== null;
	let include_top_row = document.getElementById('include_top_row').getAttribute('checked') !== null;
	let include_home_row = document.getElementById('include_home_row').getAttribute('checked') !== null;
	let include_bottom_row = document.getElementById('include_bottom_row').getAttribute('checked') !== null;

	let all_columns = keyboard_columns.concat(remedial_columns);

	let words = [];
	for (let i = 0; i < num_words; ++i) {
		let col_idx = Math.floor(Math.random() * all_columns.length);
		let column = all_columns[col_idx];
		let reverse_order = Math.random() > 0.5;
		words.push(make_word(column, include_number_row, include_top_row, include_home_row, include_bottom_row, reverse_order));
	}

	return words;
}

// Borrowed from https://stackoverflow.com/questions/7918868/how-to-escape-xml-entities-in-javascript .
function escapeHTML(unsafe) {
    return unsafe.replace(/[<>&'"]/g, function (c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
        }
    });
}

function make_elements(words) {
	let elements = [];
	let representations = {
		' ': '⍽ ',
		'\n': '⏎',
	};

	function make_character_element(ch, w, is_whitespace=false) {
		let span = document.createElement('span');
		span.setAttribute('data-character', '' + ch.charCodeAt(0));
		if (w) {
			span.setAttribute('data-word', JSON.stringify(w));
		}
		if (is_whitespace) {
			span.classList.add('whitespace');
		}
		span.classList.add('typing_text');
		let ch_repr = (representations[ch] !== undefined ? representations[ch] : ch);
		span.innerText = ch_repr;

		return span;
	}
	var i = 0;
	for (let w of words) {
		for (let ch of w) {
			let span = make_character_element(ch, w);
			elements.push(span);
		}
		if (++i < words.length) {
			elements.push(make_character_element(' ', w, is_whitespace=true));
		} else {
			elements.push(make_character_element('\n', is_whitespace=true));
			elements.push(document.createElement('br'));
		}
	}

	return elements;
}
function append_elements(elements) {
	for (let e of elements) {
		window.paperElement.appendChild(e);
	}
	let next_element = document.getElementById('next_character');
	if (! next_element) {
		elements[0].setAttribute('id', 'next_character');
	}
}
function add_line() {
	append_elements(make_elements(make_line()));
}

function array_eq(array0, array1) {
	if (array0.length !== array1.length) {
		return false;
	}
	var idx1 = 0;
	for (item0 of array0) {
		if (item0 !== array1[idx1]) {
			return false;
		}
		++idx1;
	}

	return true;
}

function key_typed(ch) {
	var next_element = document.getElementById('next_character');
	if (! next_element) {
		let last_element = window.paperElement.lastElementChild;
		if (last_element) {
			next_element = last_element;
			while (next_element.tagName != 'span') {
				next_element = next_element.previousElementSibling;
			}
		}
	}
	if (! next_element) {
		add_line();
	}
	next_element = document.getElementById('next_character');

	let next_ch_code_str = next_element.getAttribute('data-character');
	let next_ch_code = next_ch_code_str ? Number(next_ch_code_str) : 0;
	let next_ch = next_ch_code ? String.fromCharCode(next_ch_code) : '';
	//TODO: If #next_character doesn't have a data-character attribute or it's not a character code, that may indicate some kind of bug. We should probably either try to recover or fail loudly.
	if (next_ch) {
		if (ch !== next_ch) {
			next_element.classList.add('wrong_character');
			word = JSON.parse(next_element.getAttribute('data-word'));
			if (word) {
				if (remedial_columns.length > 0 && remedial_columns.at(-1) === word) {
					//Fairly basic dupe detection. Could be fooled if the user fouls up two of the same word (we would consider that a dupe), but it's probably fine.
				} else {
					remedial_columns.push(word);
					if (remedial_columns.length > max_remedial_columns) {
						remedial_columns.shift();
					}
				}
			}
		} else {
			next_element.classList.remove('wrong_character');
			next_element.classList.add('right_character');

			// If this was a whitespace character, and the most recent word was in the remedial columns list, remove it from the list.
			// Note that we're checking whether there's more than one word in the remedial list so that we don't immediately remove words as soon as they're added. (If this was >0, we'd add the word on a typo, then remove it on the following space.)
			if (remedial_columns.length > 1 && (ch === ' ' || ch === '\n')) {
				word = JSON.parse(next_element.getAttribute('data-word'));
				if (word) {
					var i = 0;
					for (existing_column of remedial_columns) {
						if (array_eq(existing_column, word)) {
							remedial_columns.splice(i, 1);
							break;
						}
						++i;
					}
				}
			}

			// Also advance the next element.
			var next_next_element = next_element.nextElementSibling;
			while (next_next_element && (next_next_element.tagName !== 'SPAN')) {
				next_next_element = next_next_element.nextElementSibling;
			}
			if (! next_next_element) {
				//TODO: Add new lines earlier (perhaps when there is one line left or three words left or something?).
				add_line();
				next_next_element = next_element.nextElementSibling;
				while (next_next_element && (next_next_element.tagName !== 'SPAN')) {
					next_next_element = next_next_element.nextElementSibling;
				}
			}
			next_element.removeAttribute('id');
			next_next_element.setAttribute('id', 'next_character');
		}
	}
}

function event_key_down(event) {
	let ch_js = event.key;
	let ch = (ch_js === 'Enter' ? '\n' : ch_js);
	key_typed(ch);
}

function init_paper() {
	window.paperElement = document.getElementById('paper');
	window.paperElement.replaceChildren();
	add_line();
	window.addEventListener('keydown', event_key_down);
}
