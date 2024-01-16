import React, { useEffect, useState, useCallback } from 'react';
import DataSource from 'devextreme/data/data_source';
import Chart, {
  ArgumentAxis, Series, ZoomAndPan, Legend, ScrollBar,  Font,LoadingIndicator
} from 'devextreme-react/chart';
const HALFDAY = 8000;
let packetsLock = 0;

const chartDataSource = new DataSource({
  store: [],
  sort: 'date',
  paginate: false,
});

function App() {

  const [visualRange, setVisualRange] = useState({ startValue: new Date("2009-01-01T00:01:00.000000Z"), endValue: new Date("2009-01-01T00:02:10.000000Z") });
  const [wholeRange, setWholeRange] = useState({ startValue: new Date("2008-12-31T23:58:25.566Z"),endValue: new Date("2009-01-01T00:05:10.000000Z") });

 const [range, setRange] = useState({ });


  useEffect(async()=>{
    let startValue=await apiCall(`SELECT pickup_datetime ,trip_distance FROM trips LIMIT 1;`)
    let endValue=await apiCall(`SELECT pickup_datetime ,trip_distance FROM trips ORDER BY pickup_datetime DESC LIMIT 1;`)
    setRange({startValue: new Date(startValue[0].pickup_datetime), endValue: new Date(endValue[0].pickup_datetime) })
  },[])
  let apiCall= async(querys)=>{
    let query = querys;
    const response = await fetch(
      `https://demo.questdb.io/exec?query=${encodeURIComponent(query)}`,
    )
    const json = await response.json()
    let zoomingData = []
    json.dataset.map((data) => {
      const date = data[0];
      let value = { [json.columns[0].name]: date, [json.columns[1].name]: data[1] }
      zoomingData = [...zoomingData, value]
    })
    return zoomingData
  }
  let getDataFrame = async (ajaxArgs) => {
    let query = `SELECT pickup_datetime ,trip_distance  FROM trips WHERE pickup_datetime BETWEEN '${ajaxArgs.startVisible}' and '${ajaxArgs.endVisible}'`
    const response = await fetch(
      `https://demo.questdb.io/exec?query=${encodeURIComponent(query)}`,
    )
    const json = await response.json()
    let zoomingData = []
    json.dataset.map((data) => {
      const date = data[0];
      let value = { [json.columns[0].name]: date, [json.columns[1].name]: data[1] }
      zoomingData = [...zoomingData, value]
    })
    return zoomingData
  }

 
  const uploadDataByVisualRange = useCallback(
    (e) => {
      const dataSource = e.component.getDataSource();
      const storage = dataSource.items();
     
      const ajaxArgs = {
        startVisible: getDateString(visualRange.startValue),
        endVisible: getDateString(visualRange.endValue),
        startBound: getDateString(storage.length ? storage[0].X : null),
        endBound: getDateString(storage.length ? storage[storage.length - 1].X : null),
      };
      if (
        ajaxArgs.startVisible !==ajaxArgs.startBound
        && ajaxArgs.endVisible !== ajaxArgs.endBound
        && !packetsLock
      ) {
        packetsLock += 1;
        e.component.showLoadingIndicator();
        getDataFrame(ajaxArgs)
          .then((dataFrame) => {
            packetsLock -= 1;
            const componentStorage = dataSource.store();
            dataFrame
                  .map((i) => ({
                    X: new Date(i.pickup_datetime),
                    Y: i.trip_distance
                  }))
                  .forEach((item) => {
 
                      componentStorage.insert(item)
                })
            dataSource.reload();
            onVisualRangeChanged(e);
          })
          .catch((error) => {
            packetsLock -= 1;
            console.log("error",error)
            dataSource.reload();
          });
      }
    },
    [visualRange],
  );
  const onVisualRangeChanged = useCallback(
    (e) => {
      const items = e.component.getDataSource().items();
    

      const currentStart = e.value.startValue;
      const currentEnd = e.value.endValue;
      let val= Math.abs(currentStart-currentEnd)
     
      if (
        (!items.length
        || items[0].X - visualRange.startValue.getTime() >=val/4
        || visualRange.endValue.getTime() - items[items.length - 1].X >=val/4)&&
          (!items.length||items[0].X <= currentStart.getTime())
      ) {
        uploadDataByVisualRange(e);
      }
    },
    [visualRange, uploadDataByVisualRange],
  );
  const handleChange = useCallback(
    (e) => {
      if (e.fullName === 'argumentAxis.visualRange') {
        const stateStart = visualRange.startValue;
        const stateEnd = visualRange.endValue;
        const currentStart = e.value.startValue;
        const currentEnd = e.value.endValue;
        const wholeStart = wholeRange.startValue;
        const wholeEnd = wholeRange.endValue;
        if (stateStart.valueOf() !== currentStart.valueOf() || stateEnd.valueOf() !== currentEnd.valueOf()) {
          setVisualRange(  { startValue: new Date(e.value.startValue), endValue: new Date(e.value.endValue) });
        
        }
        if(wholeStart.getTime() >= currentStart.getTime() || wholeEnd.getTime() <= currentEnd.getTime()){

           
             
              let currentStart1=stateStart.getTime() - ((stateEnd-stateStart)*60)
              let currentEnd1=stateEnd.getTime() + ((stateEnd-stateStart)*60)
              if(range.startValue.getTime() <=currentStart1 && range.endValue.getTime() <=currentEnd1 ){
              setWholeRange(
              {startValue: new Date(currentStart1),endValue:  new Date(currentEnd1)} 
              )

              }
              setWholeRange((prev)=>{
                return{...prev,endValue:  new Date(currentEnd1)} 
              })
              setWholeRange({startValue: new Date(currentStart1), endValue:  new Date(currentEnd1) })
              }
        onVisualRangeChanged(e);
      }
    },
    [setVisualRange, visualRange, onVisualRangeChanged,wholeRange],
  );
  function getDateString(dateTime) {
    return dateTime ? dateTime.toISOString() : '';
  }
  return (
    <Chart
      id="chart"
      palette="Harmony Light"
      dataSource={chartDataSource}
      onOptionChanged={handleChange}

    >
      <Series
        argumentField="X"
        valueField="Y"
      />

      <ArgumentAxis argumentType="datetime"  visualRange={visualRange} wholeRange={wholeRange}  visualRangeUpdateMode="keep" />
      <ScrollBar visible={false} />
      <LoadingIndicator backgroundColor="none">
        <Font size={14} />
      </LoadingIndicator> 
      <ZoomAndPan argumentAxis="both"/>
      <Legend visible={false} />
    </Chart>
  );
}

export default App;