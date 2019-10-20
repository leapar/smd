THREE.SMDLoader = function (manager) {

	this.manager = (manager !== undefined) ? manager : THREE.DefaultLoadingManager;

};



THREE.SMDLoader.prototype = {

	constructor: THREE.SMDLoader,
	loadRes: function (url) {
		return fetch(url).then((e) => {
			return e.text()
		})
	},
	load: function (params) {
		var that = this;
		return this.loadRes(params.src)
			.then(function (content) {
				return that.parse(content);
			}).then(function (result) {
				var keyTime = result._KeyTime.map(function (t) {
					return t / 30;
				});
				delete result._KeyTime;
				var animStatesList = [];
				Object.keys(result).forEach(function (name) {
					var data = result[name];
					animStatesList.push(new THREE.AnimationStates({
						nodeName: name,
						keyTime,
						states: data.translation,
						type: THREE.AnimationStates.StateType.TRANSLATION
					}));
					animStatesList.push(new THREE.AnimationStates({
						nodeName: name,
						keyTime,
						states: data.rotation,
						type: THREE.AnimationStates.StateType.ROTATION
					}));
				});
				return new THREE.Animation({
					animStatesList
				});
			}).catch(function (err) {
				console.warn('load smd failed', err);
				throw err;
			});
	},
	parse: function (content) {
		var lines = content.split(/[\n\r]+/);
		var result = {
			_KeyTime: []
		};

		var nodeMap = {};
		var currentType = '';

		lines.forEach(function (line) {
			var parts = line.trim().split(/\s+/);
			if (parts[0] === 'version') {
				return;
			} else if (line === 'nodes') {
				currentType = 'node';
			} else if (parts[0] === 'end') {
				currentType = '';
			} else if (parts[0] === 'time') {
				currentType = 'time';
				result._KeyTime.push(Number(parts[1]));
			} else if (currentType === 'node') {
				nodeMap[parts[0]] = parts[1].slice(1, -1);
			} else if (currentType === 'time') {
				var id = parts[0];
				var nodeName = nodeMap[id];
				var translation = parts.slice(1, 4).map(Number);
				var rotation = parts.slice(4, 7).map(Number);

				result[nodeName] = result[nodeName] || {};
				result[nodeName].translation = result[nodeName].translation || [];
				result[nodeName].rotation = result[nodeName].rotation || [];
				result[nodeName].translation.push(translation);
				result[nodeName].rotation.push(rotation);
			}
		});

		return result;
	}
}

var generateUUID = (i = 0,
	function (t) {
		var e = ++i;
		return t ? e = t + "_" + e : e += "",
			e
	}
)

THREE.Animation = function (t) {
	this.id = generateUUID(this.className),
		this.animStatesList = [],
		this.clips = {},
		Object.assign(this, t),
		this.initClipTime()
}

THREE.Animation._anims = []
THREE.Animation.tick = function (t) {
	this._anims.forEach((function (e) {
		return e.tick(t)
	}))
}

function isArrayLike(t) {
    return Array.isArray(t) || t.BYTES_PER_ELEMENT || t.length
}

THREE.Animation.prototype = {

	isAnimation: !0,
	className: "Animation",
	paused: !1,
	currentLoopCount: 0,
	loop: 1 / 0,
	currentTime: 0,
	timeScale: 1,
	startTime: 0,
	endTime: 0,
	clipStartTime: 0,
	clipEndTime: 0,
	nodeNameMap: null,
	_rootNode: null,
	get rootNode() {
        return this._rootNode
    },
	
	set rootNode (t) {
			this._rootNode = t,
				this.initNodeNameMap()
		
	},
	validAnimationIds: null,
	constructor: THREE.Animation,
	addClip: function (t, e, n, i) {
		this.clips[t] = {
			start: e,
			end: n,
			animStatesList: i
		}
	},
	removeClip: function (t) {
		this.clips[t] = null
	},
	getAnimStatesListTimeInfo: function (t) {
		var e = 0,
			n = 1 / 0;
		return t.forEach((function (t) {
			e = Math.max(t.keyTime[t.keyTime.length - 1], e),
				n = Math.min(t.keyTime[0], n)
		})), {
			startTime: n,
			endTime: e
		}
	},
	initClipTime: function () {
		var t = this.getAnimStatesListTimeInfo(this.animStatesList);
		this.clipStartTime = t.startTime,
			this.clipEndTime = t.endTime
	},
	initNodeNameMap: function () {
		if (this._rootNode) {
			var t = this.nodeNameMap = {};
			this._rootNode.traverse((function (e) {
				t[e.animationId] = e;
				var n = e.name;
				void 0 === n || t[n] || (t[n] = e)
			}), !1)
		}
	},
	tick: function (t) {
		this.paused || (this.currentTime += t / 1e3 * this.timeScale,
			this.currentTime >= this.endTime ? (this.currentLoopCount++,
				this.currentTime = this.endTime,
				this.updateAnimStates(),
				//this.fire("loopEnd"),
				!this.loop || this.currentLoopCount >= this.loop ? (this.stop(),
					this.fire("end")) : this.currentTime = this.startTime) : this.updateAnimStates())
	},
	updateAnimStates: function () {
		var t = this;
		return this.animStatesList.forEach((function (e) {
				e.updateNodeState(t.currentTime, t.nodeNameMap[e.nodeName])
			})),
			this
	},
	play: function (t, e) {
		var n;
		if ("string" == typeof t) {
			var i = this.clips[t];
			i ? (n = i.start,
				e = i.end,
				i.animStatesList && (this.animStatesList = i.animStatesList,
					this.initClipTime())) : m.a.warn("no this animation clip name:" + t)
		} else
			n = t;
		void 0 === n && (n = this.clipStartTime),
			void 0 === e && (e = this.clipEndTime),
			this.endTime = Math.min(e, this.clipEndTime),
			this.startTime = Math.min(n, this.endTime),
			this.currentTime = this.startTime,
			this.currentLoopCount = 0,
			this.stop(),
			this.paused = !1,
			THREE.Animation._anims.push(this)
	},
	stop: function () {
		this.paused = !0;
		var t = THREE.Animation._anims,
			e = t.indexOf(this); -
		1 !== e && t.splice(e, 1)
	},
	pause: function () {
		this.paused = !0
	},
	resume: function () {
		this.paused = !1
	},
	clone: function (t) {
		var e = new this.constructor({
			rootNode: t,
			animStatesList: this.animStatesList,
			timeScale: this.timeScale,
			loop: this.loop,
			paused: this.paused,
			currentTime: this.currentTime,
			startTime: this.startTime,
			endTime: this.endTime,
			clips: this.clips
		});
		return this.paused || e.play(),
			e
	}


}

THREE.Quaternion.prototype.fromEuler = function(t, e) {
    var n = .5 * t.x
      , i = .5 * t.y
      , r = .5 * t.z
      , s =  "ZYX"
      , a = Math.sin(n)
      , o = Math.cos(n)
      , u = Math.sin(i)
      , c = Math.cos(i)
      , h = Math.sin(r)
      , f = Math.cos(r);
      var l = [];
     "XYZ" === s ? (l[0] = a * c * f + o * u * h,
    l[1] = o * u * f - a * c * h,
    l[2] = o * c * h + a * u * f,
    l[3] = o * c * f - a * u * h) : "YXZ" === s ? (l[0] = a * c * f + o * u * h,
    l[1] = o * u * f - a * c * h,
    l[2] = o * c * h - a * u * f,
    l[3] = o * c * f + a * u * h) : "ZXY" === s ? (l[0] = a * c * f - o * u * h,
    l[1] = o * u * f + a * c * h,
    l[2] = o * c * h + a * u * f,
    l[3] = o * c * f - a * u * h) : "ZYX" === s ? (l[0] = a * c * f - o * u * h,
    l[1] = o * u * f + a * c * h,
    l[2] = o * c * h - a * u * f,
    l[3] = o * c * f + a * u * h) : "YZX" === s ? (l[0] = a * c * f + o * u * h,
    l[1] = o * u * f + a * c * h,
    l[2] = o * c * h - a * u * f,
    l[3] = o * c * f - a * u * h) : "XZY" === s && (l[0] = a * c * f - o * u * h,
    l[1] = o * u * f - a * c * h,
    l[2] = o * c * h + a * u * f,
    l[3] = o * c * f + a * u * h);
    this.fromArray(l);
   // e || this.fire("update"),
   return this
}

function cr(t, e) {
    return function(t) {
        if (Array.isArray(t))
            return t
    }(t) || function(t, e) {
        if (!(Symbol.iterator in Object(t) || "[object Arguments]" === Object.prototype.toString.call(t)))
            return;
        var n = []
          , i = !0
          , r = !1
          , s = void 0;
        try {
            for (var a, o = t[Symbol.iterator](); !(i = (a = o.next()).done) && (n.push(a.value),
            !e || n.length !== e); i = !0)
                ;
        } catch (t) {
            r = !0,
            s = t
        } finally {
            try {
                i || null == o.return || o.return()
            } finally {
                if (r)
                    throw s
            }
        }
        return n
    }(t, e) || function() {
        throw new TypeError("Invalid attempt to destructure non-iterable instance")
    }()
}


THREE.AnimationStates = function (t) {
	

	this.id = generateUUID(this.className);
	this.keyTime = [];
	this.states = [];
	Object.assign(this, t);


}

THREE.AnimationStates.StateType = {
	TRANSLATE: "Translation",
	POSITION: "Translation",
	TRANSLATION: "Translation",
	SCALE: "Scale",
	ROTATE: "Rotation",
	ROTATION: "Rotation",
	QUATERNION: "Quaternion",
	WEIGHTS: "Weights"
}




function vr(t, e) {
	return t - e
}
THREE.AnimationStates.getType = function (t) {
	return t = String(t).toUpperCase(),
		THREE.AnimationStates.StateType[t]
}
THREE.AnimationStates.interpolation = {
	
	LINEAR: function (t, e, n) {
		var	gr = [];
		if (void 0 === e)
			return t;
		if (t.slerp)
			return t.slerp(e, n);
		if (t.lerp)
			return t.lerp(e, n);
		if (Object(isArrayLike)(t)) {
			gr.length = 0;
			for (var i = t.length - 1; i >= 0; i--)
				gr[i] = t[i] + n * (e[i] - t[i]);
			return gr
		}
		return t + n * (e - t)
	},
	STEP: function (t, e, n) {
		return t
	},
	CUBICSPLINE: function (t, e, n, i) {
		var	gr = [];
		var s = t.length / 3;
		if (void 0 === e)
			return 1 === s ? t[1] : t.slice(s, -s);
		var a = t[1],
			o = t[2],
			u = e[1],
			c = e[0];
		if (s > 1 && (a = t.slice(s, -s),
				o = t.slice(-s),
				u = e.slice(s, -s),
				c = e.slice(0, s)),
			a.hermite)
			a.hermite(a, o.scale(i), u, c.scale(i), n);
		else if (a.sqlerp)
			a.sqlerp(a, o.scale(i), u, c.scale(i), n);
		else {
			Object(isArrayLike)(a) || (a = [a],
				o = [o],
				u = [u],
				c = [c]);
			var h = n * n,
				f = h * n,
				l = 2 * f - 3 * h + 1,
				d = f - 2 * h + n,
				m = -2 * f + 3 * h,
				_ = f - h;
			gr.length = 0;
			for (var p = a.length - 1; p >= 0; p--)
				gr[p] = a[p] * l + d * o[p] * i + u[p] * m + _ * c[p] * i;
			a = gr
		}
		return a
	}
}

function getIndexFromSortedArray(t, e, n) {
    if (!t || !t.length)
        return [0, 0];
    for (var i = 0, r = t.length - 1; i <= r; ) {
        var s = i + r >> 1
          , a = n(t[s], e);
        if (0 === a)
            return [s, s];
        a < 0 ? i = s + 1 : r = s - 1
    }
    return i > r ? [r, i] : [i, r]
}

THREE.AnimationStates.prototype = {
    isAnimationStates: !0,
    className: "AnimationStates",
    nodeName: "",
    type: "",
    interpolationType: "LINEAR",

	constructor: THREE.AnimationStates,


	findIndexByTime: function (t) {
		return Object(getIndexFromSortedArray)(this.keyTime, t, vr)
	},
	getStateByIndex: function (t) {
		var e = this.states.length / this.keyTime.length;
		return 1 === e ? this.states[t] : this.states.slice(t * e, t * e + e)
	},
	getState: function (t) {

		var hr = new THREE.Quaternion,
	fr = new THREE.Quaternion,
	lr = new THREE.Quaternion,
	dr = new THREE.Quaternion,
	mr = new THREE.Quaternion,
	_r = new THREE.Quaternion,
	pr = new THREE.Euler;

		var e = cr(this.findIndexByTime(t), 2),
			n = e[0],
			i = e[1];
		if (n < 0 || i >= this.keyTime.length)
			return null;
		var s = this.keyTime[n],
			a = this.keyTime[i],
			o = this.getStateByIndex(n);
		if (n === i) {
			var u = this.interpolation(o);
			return this.type === THREE.AnimationStates.StateType.ROTATION && (u = hr.fromEuler(pr.fromArray(u))),
				u.elements || u
		}
		var c = this.getStateByIndex(i),
			h = a - s,
            f = (t - s) / h;
            
        if(this.type === THREE.AnimationStates.StateType.ROTATION) {
            if(Object(isArrayLike)(o[0])) {
                o[0] = hr.fromEuler(pr.fromArray(o[0]));
                o[1] = fr.fromEuler(pr.fromArray(o[1]));
                o[2] = lr.fromEuler(pr.fromArray(o[2]));
                c[0] = dr.fromEuler(pr.fromArray(c[0]));
                c[1] = mr.fromEuler(pr.fromArray(c[1]));
                c[2] = _r.fromEuler(pr.fromArray(c[2]));
            } else {
                o = hr.fromEuler(pr.fromArray(o));
			    c = fr.fromEuler(pr.fromArray(c));
            }
        } else {
            if(this.type === THREE.AnimationStates.StateType.QUATERNION ) {
				if(Object(isArrayLike)(o[0])) {
					o[0] = hr.fromArray(o[0]);
					o[1] = fr.fromArray(o[1]);
					o[2] = lr.fromArray(o[2]);
					c[0] = dr.fromArray(c[0]);
					c[1] = mr.fromArray(c[1]);
					c[2] = _r.fromArray(c[2]);
				
                
				} else {
					o = hr.fromArray(o);
					c = fr.fromArray(c);
				}
			}
        }    
		
		var l = this.interpolation(o, c, f, h);
		return l.elements || l
	},
	interpolation: function (t, e, n, i) {
		return THREE.AnimationStates.interpolation[this.interpolationType](t, e, n, i)
	},
	updateNodeTranslation: function (t, e) {
		t.position.x = e[0],
			t.position.y = e[1],
			t.position.z = e[2]
	},
	updateNodeScale: function (t, e) {
		t.scaleX = e[0],
			t.scaleY = e[1],
			t.scaleZ = e[2]
	},
	updateNodeQuaternion: function (t, e) {
		t.quaternion.copy(e.clone())
	},
	updateNodeWeights: function (t, e) {
		var n = this._originalWeightIndices = this._originalWeightIndices || [],
			i = e.length;
		e = e.slice();
		for (var r = 0; r < i; r++)
			n[r] = r;
		for (var s = 0; s < i; s++)
			for (var a = s + 1; a < i; a++)
				if (e[a] > e[s]) {
					var o = e[s];
					e[s] = e[a],
						e[a] = o,
						o = n[s],
						n[s] = n[a],
						n[a] = o
				}
		t.traverse((function (t) {
			t.isMesh && t.geometry && t.geometry.isMorphGeometry && t.geometry.update(e, n)
		}))
	},
	updateNodeState: function (t, e) {
		if (e) {
            var n = this.type;
            
            n === THREE.AnimationStates.StateType.ROTATION && (n = THREE.AnimationStates.StateType.QUATERNION);
            if(e.name = "bicep_R" && n === THREE.AnimationStates.StateType.QUATERNION) {
              //  t = 0.003;
            }
            var i = this.getState(t);
           // if(n === THREE.AnimationStates.StateType.QUATERNION)return;
			i && this["updateNode".concat(n)](e, i)
		}
	},
	clone: function () {
		return new this.constructor({
			keyTime: this.keyTime,
			states: this.states,
			type: this.type,
			nodeName: this.nodeName
		})
	}
}
