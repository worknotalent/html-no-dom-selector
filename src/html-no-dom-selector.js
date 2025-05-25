const HTML_SAFE_CHAR_REGEX_PARTIAL_UNWRAPPED = "[^\\s\"'<>\\/=`\\[\\].#]"

const SUB_SELECTOR_REGEX = new RegExp(`<(\\*|${HTML_SAFE_CHAR_REGEX_PARTIAL_UNWRAPPED}*)|(?:(\\.)|(#))(${HTML_SAFE_CHAR_REGEX_PARTIAL_UNWRAPPED}+)|\\[(?:(?:(${HTML_SAFE_CHAR_REGEX_PARTIAL_UNWRAPPED}+)=)?"([^"]*)"|(${HTML_SAFE_CHAR_REGEX_PARTIAL_UNWRAPPED}+))\\]`, 'g')

const buildOpeningTagLeftPartRegex = (tagName) => `<${tagName}\\b`

const EMPTY_OR_GAP_REGEX = /^\s*$/

/*
    <{tagName}>
    .{className}
    [id]
    [class]
    [{othAttrName}]
    [id="{attrValue}"]
    [class="{attrValue}"]
    [{othAttrName}="{attrValue}"]
    ["{attrValue}"]
*/
const compileSelector = (selector) => {
    const subSelectors = []
    if(selector.match(EMPTY_OR_GAP_REGEX) === null){
        SUB_SELECTOR_REGEX.lastIndex = 0
        let flag
        while(flag === undefined){
            const match = SUB_SELECTOR_REGEX.exec(selector)
            if(match !== null){
                if(match[1] !== undefined){
                    if(match[1] !== '' && match[1] !== '*'){ // <{tagName}>
                        subSelectors.push(["tag", match[1]])
                    }
                }else if(match[4] !== undefined){
                    if(match[2] !== undefined){ // .{className}
                        subSelectors.push(["class", match[4]])
                    }else{ // [id="{attrValue}"]
                        subSelectors.push(["attr", "id", match[4]])
                    }
                }else if(match[7] !== undefined){ // [id] [class] [{othAttrName}]
                    subSelectors.push(["attr", match[7], null])
                }else if(match[5] !== undefined){ // [id="{attrValue}"] [class="{attrValue}"] [{othAttrName}="{attrValue}"]
                    subSelectors.push(["attr", match[5], match[6]])
                }else{ // ["{attrValue}"]
                    subSelectors.push(["attr", null, match[6]])
                }
                if(SUB_SELECTOR_REGEX.lastIndex === selector.length){
                    flag = true
                }
            }else{
                flag = false
            }
        }
        if(!flag){
            throw new Error(`Failed to parse selector "${selector}"`)
        }
    }
    return [
        new RegExp(`${subSelectors.length > 0 ? (() => {
            const firstSubSelector = subSelectors[0]
            return firstSubSelector[0] === "tag" ? buildOpeningTagLeftPartRegex(firstSubSelector[1]) : firstSubSelector[0] === "class" || firstSubSelector[2] === null ? `\\b${firstSubSelector[1]}\\b` : firstSubSelector[1] === "id" || firstSubSelector[1] === "class" || firstSubSelector[1] === null ? `(?:"${firstSubSelector[2]}"|'${firstSubSelector[2]}')` : `\\b${firstSubSelector[1]}=(?:"${firstSubSelector[2]}"|'${firstSubSelector[2]}')`
        })() : '<'}[^>]*>`, 'g'),
        subSelectors.reduce((acc, curr) => {
            if(curr[0] === "tag"){
                acc.tagName = curr[1]
            }else if(curr[0] === "class"){
                if(acc.attrs.class === undefined){
                    acc.attrs.class = []
                    acc.attrsCount++
                }
                acc.attrs.class.push([true, curr[1]])
            }else{
                if(curr[1] === null){
                    if(acc.namelessAttrs === undefined){
                        acc.namelessAttrs = []
                    }
                    acc.namelessAttrs.push(curr[2])
                }else{
                    if(acc.attrs[curr[1]] === undefined){
                        acc.attrs[curr[1]] = []
                        acc.attrsCount++
                    }
                    acc.attrs[curr[1]].push(curr[1] === "class" ? [false, curr[2]] : curr[2])
                }
            }
            return acc
        }, {attrs: {}, attrsCount: 0})
    ]
}

const SELECTOR_TO_COMPILED_SELECTOR_MAP = {}

const getCompiledSelector = (selector) => {
    let compiledSelector = SELECTOR_TO_COMPILED_SELECTOR_MAP[selector]
    if(compiledSelector === undefined){
        compiledSelector = compileSelector(selector)
        SELECTOR_TO_COMPILED_SELECTOR_MAP[selector] = compiledSelector
    }
    return compiledSelector
}

const TAG_NAME_TO_OPENING_OR_CLOSING_TAG_REGEX_MAP = {}

const getOpeningOrClosingTagRegex = (tagName) => {
    let openingOrClosingTagRegex = TAG_NAME_TO_OPENING_OR_CLOSING_TAG_REGEX_MAP[tagName]
    if(openingOrClosingTagRegex === undefined){
        openingOrClosingTagRegex = new RegExp(`(${buildOpeningTagLeftPartRegex(tagName)}[^>]*>)|(</${tagName}>)`, 'g')
        TAG_NAME_TO_OPENING_OR_CLOSING_TAG_REGEX_MAP[tagName] = openingOrClosingTagRegex
    }
    return openingOrClosingTagRegex
}

const OPENING_TAG_NAME_REGEX = new RegExp(`^${buildOpeningTagLeftPartRegex(`(${HTML_SAFE_CHAR_REGEX_PARTIAL_UNWRAPPED}+)`)}`)
const ATTR_REGEX = new RegExp(`\\b(${HTML_SAFE_CHAR_REGEX_PARTIAL_UNWRAPPED}+)(?:=(?:"([^"]*)"|'([^']*)'))?`, 'g')

const GAP_REGEX = /\s+/

/**
 * @param {*} candidateOpeningTag i.e.: `<div id="test">`
 * @param {*} selectorSignature ["tag", tagName] | ["class", className] | ["attr", "id" | "class" | attrName, attrValue | null] | ["attr", null, attrValue]
 * @returns elementMetadata{name, class: [className...], attrs: {attrName->attrValue}} | undefined
 */
const buildElementMetadataIfMatchesSelectorSignature = (candidateOpeningTag, selectorSignature) => {
    let match = candidateOpeningTag.match(OPENING_TAG_NAME_REGEX)
    if(match === null){
        return undefined
    }
    const openingTagDescriptor = {
        tagName: match[1],
        attrs: {}
    }
    if(selectorSignature.tagName !== undefined && openingTagDescriptor.tagName !== selectorSignature.tagName){
        return undefined
    }
    ATTR_REGEX.lastIndex = match.index + match[0].length
    let namelessAttrsValueSetIfAny
    if(selectorSignature.namelessAttrs !== undefined){
        namelessAttrsValueSetIfAny = new Set(selectorSignature.namelessAttrs)
    }
    let c = 0
    while((match = ATTR_REGEX.exec(candidateOpeningTag)) !== null){
        const attrName = match[1]
        if(openingTagDescriptor.attrs[attrName] !== undefined){
            return undefined
        }
        openingTagDescriptor.attrs[attrName] = match[2] ?? match[3] ?? null
        if(attrName !== "class"){
            if(selectorSignature.attrs[attrName] !== undefined){
                for(const eq of selectorSignature.attrs[attrName]){
                    if(eq !== null && openingTagDescriptor.attrs[attrName] !== eq){
                        return undefined
                    }
                }
                c++
            }
        }else{
            let classNames
            if(selectorSignature.attrs[attrName] !== undefined){
                for(const [unitCheck, className] of selectorSignature.attrs.class){
                    if(unitCheck){
                        if(classNames === undefined){
                            classNames = {
                                arr: openingTagDescriptor.attrs.class.trim().split(GAP_REGEX)
                            }
                            classNames.set = new Set(classNames.arr)
                        }
                        if(!classNames.set.has(className)){
                            return undefined
                        }
                    }else if(className !== null && openingTagDescriptor.attrs.class !== eq){
                        return undefined
                    }
                }
                c++
                if(classNames === undefined){
                    classNames = {
                        arr: openingTagDescriptor.attrs.class.trim().split(GAP_REGEX)
                    }
                }
            }else{
                classNames = {
                    arr: openingTagDescriptor.attrs.class.trim().split(GAP_REGEX)
                }
            }
            openingTagDescriptor.attrs.class = classNames.arr
        }
        if(openingTagDescriptor.attrs[attrName] !== null && namelessAttrsValueSetIfAny !== undefined){
            namelessAttrsValueSetIfAny.delete(openingTagDescriptor.attrs[attrName])
        }
        ATTR_REGEX.lastIndex = match.index + match[0].length
    }
    if(c !== selectorSignature.attrsCount || (namelessAttrsValueSetIfAny !== undefined && namelessAttrsValueSetIfAny.size !== 0)){
        return undefined
    }
    return openingTagDescriptor
}

/**
 * @param {*} explorationMode "nested" | "flat"
 * @returns 
 */
export const selectAll = (htmlFragment, selector, {limit=+Infinity, explorationMode="nested"}={}) => {
    const [anchoringRegex, signature] = getCompiledSelector(selector)
    const elements = []
    if(limit <= 0){
        return elements
    }
    anchoringRegex.lastIndex = 0
    let anchorMatch
    while((anchorMatch = anchoringRegex.exec(htmlFragment)) !== null){
        let anchor = anchorMatch[0]
        let anchorStartIndex = anchorMatch.index
        let flag = undefined
        while(flag === undefined){
            if(htmlFragment[anchorStartIndex] !== '<'){
                if(anchorStartIndex > 0){
                    anchorStartIndex--
                }else{
                    flag = false
                }
            }else{
                flag = true
            }
        }
        if(flag){
            if(anchorStartIndex < anchorMatch.index){
                anchor = htmlFragment.substring(anchorStartIndex, anchorMatch.index) + anchor
            }
            const elementMetadata = buildElementMetadataIfMatchesSelectorSignature(anchor, signature)
            if(elementMetadata !== undefined){
                const openingOrClosingTagRegex = getOpeningOrClosingTagRegex(elementMetadata.tagName)
                openingOrClosingTagRegex.lastIndex = anchoringRegex.lastIndex
                let openingOrClosingTagMatch
                let depth = 1
                let flag = false
                while(!flag){
                    openingOrClosingTagMatch = openingOrClosingTagRegex.exec(htmlFragment)
                    if(openingOrClosingTagMatch !== null){
                        if(openingOrClosingTagMatch[2] !== undefined){
                            depth--
                            if(depth === 0){
                                elements.push({
                                    metadata: elementMetadata,
                                    innerHTML: htmlFragment.substring(anchoringRegex.lastIndex, openingOrClosingTagMatch.index)
                                })
                                if(elements.length === limit){
                                    return elements
                                }
                                if(explorationMode === "flat"){
                                    anchoringRegex.lastIndex = openingOrClosingTagMatch.index + openingOrClosingTagMatch[0].length
                                }
                                flag = true
                            }
                        }else{
                            depth++
                        }
                    }else{
                        flag = true
                    }
                }
            }
        }
    }
    return elements
}

/**
 * @param {*} explorationMode "nested" | "flat"
 * @returns 
 */
export const selectFirst = (htmlFragment, selector, {explorationMode="nested"}={}) => selectAll(htmlFragment, selector, {limit: 1, explorationMode})[0]