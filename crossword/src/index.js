import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import './styles/main.scss';
import { version } from '../package.json';
import { getCrossword } from './static.js';
import { iconKey, iconConfirm, iconList, iconShuffle, iconClear } from './Svg'

const directions = {
    Down: start => (i => [start[0], start[1] + i]),
    Across: start => (i => [start[0] + i, start[1]])
};

function mapDirection(word) {
    return directions[word.d](word.s)
}

function mapWord(word) {
    const dir = mapDirection(word);
    const letters = Array.from(word.w);
    const items = letters.map((l,i) => [l, dir(i)]);
    return items;
}

function calculatePad(crossword) {
    let pad = Object();
    for(const word of crossword.words) {
        for(const [l, pos] of mapWord(word)) {
            pad[pos] = {
                l:l,
                guess:null
            };
        }
    }
    return pad;
}

function Square(props) {
    return (
        <button className="square" onClick={props.onClick}>
            {props.value}
        </button>
    );
}

function shuffle(array) {
    array = array.slice();
    for (let i = array.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

class Guessbox extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            letters: props.letters.map((x) => ({l: x, used: false})),
            value: "",
						renderList: false
        }
    }

    handleSubmit() {
        if (this.state.value.length < 3)
            return;
        this.props.onGuess(this.state.value);
        this.clear();
    }

    handleShuffle() {
        this.setState({
            ...this.state,
            letters: shuffle(this.state.letters)
        })
    }
    
    handleRenderList() {
    	this.setState({
				renderList: !this.state.renderList
			})
		}

    handleClear() {
        this.clear();
    }

    handleDelete() {
        const last = this.state.value.slice(-1);
        const letter = this.state.letters.find(l => (l.used && l.l == last))
        this.setState({
            ...this.state,
            letters: this.state.letters.map(l => (l === letter) ? {...l, used:false} : l),
            value: this.state.value.slice(0, -1)
        })
    }

    clear() {
        this.setState({
            ...this.state,
            letters: this.state.letters.map(l => ({...l, used:false})),
            value: ""
        })
    }

    handleClick(i) {
        if (this.state.letters[i].used)
            return;
        const letters = this.state.letters.slice();
        letters[i].used = true;
        const value = this.state.value + letters[i].l
        this.setState({
            ...this.state,
            letters: letters,
            value: value
        })
    }

    renderLetter(l, i) {
        if (l.used) {
            return (
                <span key={i} className="c-letter c-letter--used">
									<span className="c-letter__bg">{ iconKey() }</span>
									<span className="c-letter__letter">{l.l}</span>
                </span>
            );
        } else {
            return (
                <span key={i} className="c-letter c-letter--unused" onClick={(e) => this.handleClick(i)}>
									<span className="c-letter__bg">{ iconKey() }</span>
									<span className="c-letter__letter">{l.l}</span>
                </span>
            );
        }
    }
    
    renderWordList() {
    	return <div className="c-word-list">
				v: {version}
			</div>
		}

    render() {
        return (
            <div className="c-guessbox">
                <div className="c-word">
									{ this.state.value &&
											<div className="c-word__container">
												{Array.from(this.state.value).map((l,i) => (
													<span key={i}>{l}</span>
												))}
												<button
													className="c-word__clear-button"
													onClick={(e)=>this.handleDelete()}>
													{ iconClear() }
												</button>
											</div>
											
									}
                </div>
                <div className="c-chooser">
                    {this.state.letters.map((l,i) => this.renderLetter(l, i))}
                </div>
                <div className="c-actions">
                    
                    {/*<button onClick={(e) => this.handleClear()} title="Clear">*/}
                        {/*{ iconClear() }*/}
                    {/*</button>*/}
									<button onClick={ (e) => this.handleRenderList() }>
										{ iconList() }
									</button>
									<button onClick={(e) => this.handleSubmit()} title="Go">
										{ iconConfirm() }
									</button>
									<button onClick={(e) => this.handleShuffle()} title="Shuffle">
										{ iconShuffle() }
									</button>
                </div>
							
								{ this.state.renderList && this.props.history }
            </div>
        );
    }
}




function range(x) {
    let iter = [];
    for(let i = 0; i < x; i++) {
        iter.push(i);
    }
    return iter;
}

class Game extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            history: [],
            pad: calculatePad(props.crossword),
            guesses: [],
            cols: range(props.crossword.size[0]),
            rows: range(props.crossword.size[1]),
            crossword: props.crossword
        };
    }

    isRepeatGuess(w) {
        let history = this.state.history;
        const isw = x => x.w === w;
        const fnot = f => ((...args) => !f(...args))
        const repeat = history.find(isw)
        if (repeat) {
            history = [
                {
                    ...repeat,
                    repeat: 1 + (repeat.repeat || 0)}
            ].concat(history.filter(fnot(isw)))
            this.setState({
                ...this.state,
                history: history
            });
            return true;
        }
        return false;
    }

    handleGuess(w) {
        if (this.isRepeatGuess(w)) {
            return;
        }
        let history = this.state.history;
        let guesses = this.state.guesses;
        let pad = this.state.pad;
        const hit = this.props.crossword.words.find(x=>x.w===w);
        if (hit) {
            pad = {...this.state.pad}
            guesses = guesses.concat([w])
            history = [{w:w, k:history.length, guess:true}].concat(history)
            for(const [l, pos] of mapWord(hit)) {
                pad[pos] = {
                    l:l,
                    guess:guesses.length
                };
            }
        } else {
            const known = this.props.crossword.unused.find(x=>x===w);
            history = [{w:w, k:history.length, guess:false, known:!!known}].concat(history)
        }
        const newState = {
            ...this.state,
            history: history,
            pad: pad,
            guesses: guesses
        };
        console.log(w, hit, newState);
        this.setState(newState);
    }

    handleHint(x,y) {
        let history = this.state.history;
        let pad = {...this.state.pad};
        let cell = pad[[x,y]];
        const w = ("?" + x + ',' + y);
        history = [{x:x, y:y,
                    k:history.length,
                    hint:cell.l,
                    w: w
                   }].concat(history);
        pad[[x,y]] = {
            ...cell,
            hint: 1 + (cell.hint || 0)
        };
        this.setState({
            ...this.state,
            history: history,
            pad: pad
        });
    }

    renderCell(x,y) {
        let p = this.state.pad[[x,y]];
        let k = x;
        let l;
        let opt = {};
        if (p === undefined) {
            opt.className="cell void";
            l="";
        } else if (p.guess === null && (p.hint || 0) < this.props.hintLimit) {
            opt.className="cell empty";
            opt.onClick = e => this.handleHint(x,y);
            l=" ";
        } else if (p.guess < this.state.guesses.length) {
            opt.className="cell solved";
            l=p.l;
        } else {
            opt.className="cell solved guessed";
            l=p.l;
        }

        if (p && p.hint && p.hint >= this.props.hintLimit) {
            opt.className += "cell hint";
        }

        return (
					<div {...opt} key={k}>
							<span>{l}</span>
					</div>
        );
    }

    renderRow(y) {
        return (
            <div className="row" key={y}>
                {this.state.cols.map(x => this.renderCell(x,y))}
            </div>
        );
    }

    renderPad() {
    	// todo converted from table
        return (
            <div className="grid">
								{this.state.rows.map(y => this.renderRow(y))}
            </div>
        );
    }
    
    renderHistory() {
    	return <div className="c-history">
				<ul>
					{this.state.history.map((w,i)=>(
						<li key={w.k}
								className={((w.guess) ? "guess" :
									((w.known) ? "known" : "weird"))}>
							{w.w} {w.repeat &&
						<span>
                                           {"➰".repeat(w.repeat)}
                                       </span>}
						</li>))}
						<li className="app-version">version: { version }</li>
				</ul>
			</div>
		}

    render() {
        const letters = Array.from(this.props.crossword.letters).slice().sort();
        return (
            <div className="game">
                {this.renderPad()}
                    <Guessbox
                        letters={letters}
                        onGuess={(w) => this.handleGuess(w)}
												history={this.renderHistory()}
                    />
                
            </div>
        );
    }
}

class App extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            crossword: getCrossword()
        }
    }
		
    render() {
    	console.log(this.state.renderList)
        return (
            <div>
                <Game
                    crossword={this.state.crossword}
                    hintLimit={5}
                />
            </div>
        )
    }
}

// ========================================

ReactDOM.render(
    <App />,
    document.getElementById('root')
);

